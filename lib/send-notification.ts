import prismadb from "./prismadb";
import { ADMIN_EXTERNAL_ID } from "./service-auth";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts";

interface ExpoPushMessage {
    to: string;
    title: string;
    body: string;
    data?: object;
}

/** A ticket from Expo's /push/send response. */
interface ExpoPushTicket {
    status?: string;
    id?: string;
    message?: string;
    details?: { error?: string };
}

/**
 * Deliver one message to one token, and actually inspect what Expo says.
 *
 * Two distinct failure shapes have to be handled, and neither throws:
 *
 *  - A non-2xx response. fetch() resolves normally on a 400, so this is
 *    invisible unless res.ok is checked. Expo reports the reason in an
 *    `errors` array (e.g. PUSH_TOO_MANY_EXPERIENCE_IDS).
 *  - A 200 whose ticket carries status: "error". This is where
 *    DeviceNotRegistered surfaces — the send succeeded, the delivery did not.
 *
 * A DeviceNotRegistered ticket removes the token right away. Successful
 * tickets are stored so the daily receipt check (checkPushReceipts) can catch
 * the tokens that only fail at delivery time.
 */
async function sendToOneToken(
    token: string,
    title: string,
    body: string,
    data?: object
): Promise<void> {
    try {
        const message: ExpoPushMessage = {
            to: token,
            title,
            body,
            ...(data ? { data } : {}),
        };

        const res = await fetch(EXPO_PUSH_URL, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Accept-Encoding": "gzip, deflate",
                "Content-Type": "application/json",
            },
            // Array of one, so the response shape is always { data: [ticket] }.
            body: JSON.stringify([message]),
        });

        const payload = await res.json().catch(() => null);

        if (!res.ok) {
            const errors = Array.isArray(payload?.errors) ? payload.errors : [];
            if (errors.length === 0) {
                console.error(
                    `[PUSH_NOTIFICATION] Expo rejected send (HTTP ${res.status}) for ${token}`
                );
            }
            for (const err of errors) {
                console.error(
                    `[PUSH_NOTIFICATION] Expo rejected send (HTTP ${res.status}) for ${token}: ` +
                    `${err?.code ?? "UNKNOWN"} — ${err?.message ?? "no message"}`
                );
            }
            return;
        }

        const tickets: ExpoPushTicket[] = Array.isArray(payload?.data)
            ? payload.data
            : payload?.data
                ? [payload.data]
                : [];

        for (const ticket of tickets) {
            if (ticket?.status === "error") {
                console.error(
                    `[PUSH_NOTIFICATION] Delivery error for ${token}: ` +
                    `${ticket.details?.error ?? "UNKNOWN"} — ${ticket.message ?? "no message"}`
                );
                if (ticket.details?.error === "DeviceNotRegistered") {
                    await removePushToken(token);
                }
            } else if (ticket?.status === "ok" && ticket.id) {
                await prismadb.pushTicket
                    .create({ data: { id: ticket.id, token } })
                    .catch((err) => console.error("[PUSH_NOTIFICATION] Could not store ticket:", err));
            }
        }
    } catch (error) {
        console.error(`[PUSH_NOTIFICATION] Failed to send to ${token}:`, error);
    }
}

/**
 * Fire-and-forget push notification via Expo's push API.
 * Never throws — a notification failure must never break the calling flow (e.g. checkout, booking).
 */
export async function sendPushNotification(
    token: string,
    title: string,
    body: string,
    data?: object
): Promise<void> {
    return sendPushNotifications([token], title, body, data);
}

/**
 * Same as sendPushNotification but accepts multiple tokens (e.g. admin broadcasts).
 *
 * Sends one request per token rather than batching. Expo rejects an entire
 * request with PUSH_TOO_MANY_EXPERIENCE_IDS if its tokens span more than one
 * project, so a single token left over from an old Expo account was enough to
 * silently drop every admin broadcast. Per-token sending makes one bad token
 * cost only its own delivery, and is the shape the per-device fan-out needs.
 */
export async function sendPushNotifications(
    tokens: string[],
    title: string,
    body: string,
    data?: object
): Promise<void> {
    try {
        // Dedupe so a token shared by two rows isn't delivered twice.
        const validTokens = Array.from(new Set(tokens.filter(Boolean)));
        if (validTokens.length === 0) return;

        await Promise.all(
            validTokens.map((token) => sendToOneToken(token, title, body, data))
        );
    } catch (error) {
        console.error("[PUSH_NOTIFICATION] Failed to send:", error);
    }
}

/**
 * Broadcast to every real admin who has a push token registered.
 *
 * Resolves the recipients in a single query and hands them to the multi-token
 * sender. The synthetic service user is excluded explicitly: it is a shared
 * row, not a person holding a device.
 *
 * Never throws. The send path swallows its own errors, but the lookup can fail
 * independently, so it carries its own guard.
 */
export async function notifyAdmins(
    title: string,
    body: string,
    data?: object
): Promise<void> {
    try {
        const admins = await prismadb.user.findMany({
            where: {
                isAdmin: true,
                clerkId: { not: ADMIN_EXTERNAL_ID },
            },
            select: { pushToken: true, pushTokens: { select: { token: true } } },
        });

        const tokens = admins.flatMap((a) => [
            ...a.pushTokens.map((t) => t.token),
            ...(a.pushToken ? [a.pushToken] : []),
        ]);

        if (tokens.length === 0) return;

        await sendPushNotifications(tokens, title, body, data);
    } catch (error) {
        console.error("[PUSH_NOTIFICATION] Failed to notify admins:", error);
    }
}

/** Compact label for push bodies, e.g. "Mon 2 Jun at 14:00" (same as checkout's). */
export function formatWhen(date: Date | string): string {
    const d = new Date(date);
    const day = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
    return `${day} at ${time}`;
}

/**
 * Push to every device of one user, if they have any. Skips the synthetic service
 * user (guest bookings are attached to it; it is not a person with a device).
 *
 * Never throws, so callers can fire it after their success path.
 */
export async function notifyUser(
    userId: string | null | undefined,
    title: string,
    body: string,
    data?: object
): Promise<void> {
    if (!userId) return;
    try {
        const user = await prismadb.user.findUnique({
            where: { id: userId },
            select: { pushToken: true, clerkId: true, pushTokens: { select: { token: true } } },
        });
        if (!user || user.clerkId === ADMIN_EXTERNAL_ID) return;
        // Every device the user has signed in on, plus the legacy single column.
        const tokens = [
            ...user.pushTokens.map((t) => t.token),
            ...(user.pushToken ? [user.pushToken] : []),
        ];
        await sendPushNotifications(tokens, title, body, data);
    } catch (error) {
        console.error("[PUSH_NOTIFICATION] Failed to notify user:", error);
    }
}

/** Forget a dead token everywhere it is stored. Never throws. */
export async function removePushToken(token: string): Promise<void> {
    try {
        await prismadb.pushToken.deleteMany({ where: { token } });
        await prismadb.user.updateMany({ where: { pushToken: token }, data: { pushToken: null } });
        console.log(`[PUSH_NOTIFICATION] Removed dead token ${token}`);
    } catch (error) {
        console.error("[PUSH_NOTIFICATION] Failed to remove token:", error);
    }
}

/**
 * Fetch Expo receipts for stored tickets and remove tokens whose delivery
 * failed with DeviceNotRegistered. Expo keeps receipts for 24 h and they can
 * take a while to appear, so tickets younger than 15 minutes wait for the next
 * run; older than 24 h are dropped unchecked. Run daily by /api/cron/push-receipts.
 */
export async function checkPushReceipts(): Promise<{ checked: number; removed: number }> {
    const now = Date.now();
    await prismadb.pushTicket.deleteMany({
        where: { createdAt: { lt: new Date(now - 24 * 60 * 60 * 1000) } },
    });
    const tickets = await prismadb.pushTicket.findMany({
        where: { createdAt: { lt: new Date(now - 15 * 60 * 1000) } },
        select: { id: true, token: true },
    });

    let removed = 0;
    // Expo accepts up to 1000 receipt ids per request.
    for (let i = 0; i < tickets.length; i += 1000) {
        const chunk = tickets.slice(i, i + 1000);
        const res = await fetch(EXPO_RECEIPTS_URL, {
            method: "POST",
            headers: { Accept: "application/json", "Content-Type": "application/json" },
            body: JSON.stringify({ ids: chunk.map((t) => t.id) }),
        });
        const payload = await res.json().catch(() => null);
        const receipts: Record<string, ExpoPushTicket> = payload?.data ?? {};

        for (const ticket of chunk) {
            const receipt = receipts[ticket.id];
            if (receipt?.status === "error") {
                console.error(
                    `[PUSH_NOTIFICATION] Receipt error for ${ticket.token}: ` +
                    `${receipt.details?.error ?? "UNKNOWN"} — ${receipt.message ?? "no message"}`
                );
                if (receipt.details?.error === "DeviceNotRegistered") {
                    await removePushToken(ticket.token);
                    removed++;
                }
            }
        }
        // Receipts were read (or are gone): don't check these tickets again.
        await prismadb.pushTicket.deleteMany({ where: { id: { in: chunk.map((t) => t.id) } } });
    }

    return { checked: tickets.length, removed };
}

import prismadb from "./prismadb";
import { ADMIN_EXTERNAL_ID } from "./service-auth";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

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
 * Both are logged with the offending token so a dead token can be identified
 * and cleared by hand until automatic pruning exists.
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
 * sender. The synthetic service user is excluded explicitly: ensureServiceUser()
 * creates its row with isAdmin: true, so it would otherwise match — and it is a
 * shared row, not a person holding a device.
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
                pushToken: { not: null },
                clerkId: { not: ADMIN_EXTERNAL_ID },
            },
            select: { pushToken: true },
        });

        const tokens = admins
            .map((a) => a.pushToken)
            .filter((t): t is string => !!t);

        if (tokens.length === 0) return;

        await sendPushNotifications(tokens, title, body, data);
    } catch (error) {
        console.error("[PUSH_NOTIFICATION] Failed to notify admins:", error);
    }
}

import prismadb from "./prismadb";
import { ADMIN_EXTERNAL_ID } from "./service-auth";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface ExpoPushMessage {
    to: string;
    title: string;
    body: string;
    data?: object;
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
 */
export async function sendPushNotifications(
    tokens: string[],
    title: string,
    body: string,
    data?: object
): Promise<void> {
    try {
        const validTokens = tokens.filter(Boolean);
        if (validTokens.length === 0) return;

        const messages: ExpoPushMessage[] = validTokens.map((to) => ({
            to,
            title,
            body,
            ...(data ? { data } : {}),
        }));

        await fetch(EXPO_PUSH_URL, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Accept-Encoding": "gzip, deflate",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(messages),
        });
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

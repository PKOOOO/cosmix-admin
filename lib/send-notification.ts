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

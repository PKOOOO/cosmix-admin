import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "clerk_user_session";
const SESSION_MAX_AGE = 60 * 60 * 24; // 24 hours

/**
 * Set a session cookie with the Clerk user ID
 * This persists across redirects within the WebView
 */
export function setUserSession(clerkUserId: string) {
    cookies().set(SESSION_COOKIE_NAME, clerkUserId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_MAX_AGE,
        path: "/",
    });
}

/**
 * Get the Clerk user ID from the session cookie
 */
export function getUserSession(): string | null {
    return cookies().get(SESSION_COOKIE_NAME)?.value || null;
}

/**
 * Clear the user session cookie
 */
export function clearUserSession() {
    cookies().delete(SESSION_COOKIE_NAME);
}

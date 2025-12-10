import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClerkClient } from "@clerk/nextjs/server";

const COOKIE_NAME = "__session";
const DEFAULT_REDIRECT = "/dashboard";
const TOKEN_TEMPLATE = process.env.CLERK_SSO_JWT_TEMPLATE || "admin-sso";

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY || "",
});

/**
 * SSO handoff endpoint.
 * Accepts a Clerk JWT (from the mobile app) via ?token=...
 * Verifies it with Clerk, creates a Clerk session for that user,
 * sets the Clerk session cookie, and redirects into the app.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const redirect = url.searchParams.get("redirect") || DEFAULT_REDIRECT;

  if (!token) {
    return NextResponse.redirect(new URL("/sign-in", url));
  }

  try {
    // Verify the mobile-issued token against the shared Clerk instance
    const verification = await (clerk as any).verifyToken(token, {
      template: TOKEN_TEMPLATE,
    });

    const payload = (verification as any)?.payload || {};
    const userId = payload.sub;

    if (!userId) {
      throw new Error("Token verified but missing user id");
    }

    // Create a real Clerk session for this user so middleware recognizes it
    const session = await (clerk as any).sessions.create({ userId });
    if (!session || !session.id) {
      throw new Error("Failed to create Clerk session");
    }

    // Prefer the session token/JWT from the created session
    const sessionToken =
      (session as any).lastActiveToken?.jwt ||
      (session as any).lastActiveToken ||
      (session as any).sessionToken ||
      null;

    if (!sessionToken) {
      throw new Error("Created session but no session token was returned");
    }

    // Set Clerk session cookie (__session) with the Clerk session token
    cookies().set({
      name: COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      // Optional: expire with session maxAge if present
      ...(session.expireAt
        ? { expires: new Date(session.expireAt * 1000) }
        : {}),
    });

    return NextResponse.redirect(new URL(redirect, url));
  } catch (error) {
    console.error("SSO verification failed:", error);
    return NextResponse.redirect(new URL("/sign-in", url));
  }
}


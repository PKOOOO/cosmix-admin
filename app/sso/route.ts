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
  const host = url.hostname;

  if (!token) {
    return NextResponse.redirect(new URL("/sign-in", url));
  }

  try {
    console.log("SSO start", {
      template: TOKEN_TEMPLATE,
      tokenPreview: String(token).slice(0, 10) + "...",
      redirect,
      host,
    });

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

    // Always create an explicit session token for the cookie
    let sessionToken: string | null = null;
    if ((clerk as any).sessions?.createSessionToken) {
      const tokenResp = await (clerk as any).sessions.createSessionToken({
        sessionId: session.id,
      });
      sessionToken =
        (tokenResp as any)?.jwt ||
        (tokenResp as any)?.token ||
        (tokenResp as any)?.sessionToken ||
        null;
    }

    if (!sessionToken) {
      throw new Error("Created session but no session token was returned");
    }

    console.log("SSO success", {
      userId,
      sessionId: session.id,
      hasToken: !!sessionToken,
      tokenPreview: String(sessionToken).slice(0, 12) + "...",
      tokenSource: (session as any).lastActiveToken
        ? "lastActiveToken"
        : (clerk as any).sessions?.createSessionToken
        ? "createdSessionToken"
        : "unknown",
      template: TOKEN_TEMPLATE,
    });

    // Set Clerk session cookie (__session) with the Clerk session token
    cookies().set({
      name: COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      domain: host.includes("localhost") ? undefined : host,
      // Optional: expire with session maxAge if present
      ...(session.expireAt
        ? { expires: new Date(session.expireAt * 1000) }
        : {}),
    });

    return NextResponse.redirect(new URL(redirect, url));
  } catch (error) {
    console.error("SSO verification failed:", {
      message: (error as any)?.message,
      stack: (error as any)?.stack,
      template: TOKEN_TEMPLATE,
    });
    return NextResponse.redirect(new URL("/sign-in", url));
  }
}


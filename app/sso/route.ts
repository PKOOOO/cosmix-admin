import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyToken } from "@clerk/backend";
import { clerkClient } from "@clerk/nextjs/server";

const COOKIE_NAME = "__session";
const DEFAULT_REDIRECT = "/dashboard";
const TOKEN_TEMPLATE = process.env.CLERK_SSO_JWT_TEMPLATE || "admin-sso";

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || "";

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
  const debug = url.searchParams.get("debug") === "1";

  if (!token) {
    const dest = new URL("/sign-in", url);
    return debug
      ? NextResponse.json(
          { ok: false, reason: "missing token", redirect: dest.toString() },
          { status: 400 }
        )
      : NextResponse.redirect(dest);
  }

  try {
    console.log("SSO start", {
      template: TOKEN_TEMPLATE,
      tokenPreview: String(token).slice(0, 10) + "...",
      redirect,
      host,
    });

    if (!CLERK_SECRET_KEY) {
      throw new Error("CLERK_SECRET_KEY is not configured");
    }

    // Verify the mobile-issued token against the shared Clerk instance
    const verification = await verifyToken(token, {
      secretKey: CLERK_SECRET_KEY,
      authorizedParties: [],
    } as any);

    const payload = (verification as any)?.payload || {};

    let decoded: any = {};
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        decoded = JSON.parse(
          Buffer.from(parts[1], "base64").toString("utf8")
        );
      }
    } catch (err) {
      console.error("SSO decode error:", err);
    }

    const userId =
      (payload as any).sub ||
      (payload as any).userId ||
      (payload as any).user_id ||
      (payload as any).sid ||
      decoded.sub ||
      decoded.userId ||
      decoded.user_id ||
      decoded.sid ||
      null;

    if (!userId) {
      const msg = `Token verified but missing user id. Payload keys: ${Object.keys(
        payload || {}
      ).join(",")} Decoded keys: ${Object.keys(decoded || {}).join(",")}`;
      throw new Error(msg);
    }

    // Create a real Clerk session for this user so middleware recognizes it
    const session = await (clerkClient as any).sessions.create({ userId });
    if (!session || !session.id) {
      throw new Error("Failed to create Clerk session");
    }

    // Always create an explicit session token for the cookie
    let sessionToken: string | null = null;
    if ((clerkClient as any).sessions?.createSessionToken) {
      const tokenResp = await (clerkClient as any).sessions.createSessionToken({
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
        : (clerkClient as any).sessions?.createSessionToken
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

    if (debug) {
      return NextResponse.json(
        {
          ok: true,
          userId,
          sessionId: session.id,
          tokenSource: "createdSessionToken",
          template: TOKEN_TEMPLATE,
          redirect,
          host,
        },
        { status: 200 }
      );
    }

    return NextResponse.redirect(new URL(redirect, url));
  } catch (error) {
    console.error("SSO verification failed:", {
      message: (error as any)?.message,
      stack: (error as any)?.stack,
      template: TOKEN_TEMPLATE,
    });
    if (debug) {
      return NextResponse.json(
        {
          ok: false,
          error: (error as any)?.message,
          template: TOKEN_TEMPLATE,
        },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL("/sign-in", url));
  }
}


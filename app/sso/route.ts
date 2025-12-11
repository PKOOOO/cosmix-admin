import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyToken, createClerkClient } from "@clerk/backend";
import { clerkClient } from "@clerk/nextjs/server";

const COOKIE_NAME = "__session";
const DEFAULT_REDIRECT = "/dashboard";
const TOKEN_TEMPLATE = process.env.CLERK_SSO_JWT_TEMPLATE || "admin-sso";

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || "";
const backendClerk = CLERK_SECRET_KEY ? createClerkClient({ secretKey: CLERK_SECRET_KEY }) : null;

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

    // Fallback approach: create a sign-in token and redirect through Clerk's verify endpoint
    if (!backendClerk || !(backendClerk as any).signInTokens) {
      throw new Error("signInTokens API not available; please upgrade @clerk/backend / @clerk/nextjs");
    }

    // Create a sign-in token for this user and redirect through Clerk's verify endpoint
    const signInToken = await (backendClerk as any).signInTokens.create({ userId });
    const signInTokenValue = (signInToken as any)?.token;
    if (!signInTokenValue) {
      throw new Error("Failed to create sign-in token");
    }

    const redirectUrl = new URL(`/sign-in/verify`, url);
    redirectUrl.searchParams.set("token", signInTokenValue);
    redirectUrl.searchParams.set("redirect_url", redirect);

    console.log("SSO success via sign-in token", {
      userId,
      template: TOKEN_TEMPLATE,
      redirect: redirectUrl.toString(),
    });

    if (debug) {
      return NextResponse.json(
        {
          ok: true,
          userId,
          tokenSource: "sign-in-token",
          template: TOKEN_TEMPLATE,
          redirect: redirectUrl.toString(),
          host,
        },
        { status: 200 }
      );
    }

    return NextResponse.redirect(redirectUrl);
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


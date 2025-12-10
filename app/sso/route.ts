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
 * Verifies it with Clerk, sets the session cookie, and redirects into the app.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const redirect = url.searchParams.get("redirect") || DEFAULT_REDIRECT;

  // Require a token
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
    const exp = payload.exp ? new Date(payload.exp * 1000) : undefined;

    if (!userId) {
      throw new Error("Token verified but missing user id");
    }

    // Set the session cookie for the web app
    cookies().set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      expires: exp,
    });

    return NextResponse.redirect(new URL(redirect, url));
  } catch (error) {
    console.error("SSO verification failed:", error);
    return NextResponse.redirect(new URL("/sign-in", url));
  }
}


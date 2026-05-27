// app/post-sign-in/page.tsx
import { auth } from "@clerk/nextjs"
import { verifyToken } from "@clerk/backend"
import { redirect } from "next/navigation"
import { headers, cookies } from "next/headers"
import prismadb from "@/lib/prismadb"
import { isAuthorizedRequest } from "@/lib/service-auth"
import { getOrCreateUserFromClerk } from "@/lib/get-or-create-user"
import { PostSignInClient } from "./post-sign-in-client"
import { PostSignInError } from "./error-component"

/**
 * SECURITY NOTE: We do NOT decode JWT tokens manually anymore.
 * Previously we had a decodeJWT function that decoded tokens without signature verification,
 * which allowed anyone to forge tokens and create fake users in the database.
 * 
 * Now we ONLY use Clerk's verifyToken from @clerk/backend to validate tokens.
 */

/**
 * Verify a Clerk JWT token using Clerk's backend API
 * This ensures the token is actually signed by Clerk and not forged
 */
async function verifyClerkToken(token: string): Promise<string | null> {
  try {
    // Issuer is derived automatically from CLERK_SECRET_KEY in @clerk/backend v1+.
    const verifiedToken = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
      clockSkewInMs: 300000, // 5 minutes for network latency
    });

    if (verifiedToken && verifiedToken.sub) {
      console.log('[POST_SIGN_IN] Token verified successfully, userId:', verifiedToken.sub);
      return verifiedToken.sub;
    }

    console.log('[POST_SIGN_IN] Token verification returned no userId');
    return null;
  } catch (error: any) {
    console.log('[POST_SIGN_IN] Token verification failed:', error?.message || error);
    return null;
  }
}

export default async function PostSignIn() {
  // Check for bearer token authentication first (from WebView)
  const isAuthorized = isAuthorizedRequest();
  let clerkUserId: string | null = null;
  let isTokenVerified = false;
  let hadUserToken = false; // Track if x-user-token was provided

  // PRIORITY 1: Try Clerk's built-in auth() first - this is the most secure
  try {
    const clerkAuth = auth();
    if (clerkAuth?.userId) {
      clerkUserId = clerkAuth.userId;
      isTokenVerified = true;
      console.log("PostSignIn - Clerk userId from Clerk auth():", clerkUserId);
    }
  } catch (error) {
    console.log("PostSignIn - Clerk auth() failed:", error);
  }

  // PRIORITY 2: If no Clerk auth and we have a bearer token, try to verify the X-User-Token
  if (!clerkUserId && isAuthorized) {
    try {
      const headerPayload = headers();
      const clerkToken = headerPayload.get("x-user-token");

      if (clerkToken) {
        hadUserToken = true;
        // CRITICAL: Verify the token with Clerk's API, don't just decode it!
        clerkUserId = await verifyClerkToken(clerkToken);
        if (clerkUserId) {
          isTokenVerified = true;
        }
      }
    } catch (error) {
      console.log("PostSignIn - Error reading headers:", error);
    }
  }

  // PRIORITY 3: Try cookie if header was lost during redirect
  if (!clerkUserId && isAuthorized) {
    try {
      const cookieStore = cookies();
      const cookieToken = cookieStore.get("x-user-token-session")?.value;
      if (cookieToken) {
        hadUserToken = true;
        // CRITICAL: Verify the token with Clerk's API, don't just decode it!
        clerkUserId = await verifyClerkToken(cookieToken);
        if (clerkUserId) {
          isTokenVerified = true;
          console.log("PostSignIn - Clerk userId from verified cookie:", clerkUserId);
        }
      }
    } catch (error) {
      console.log("PostSignIn - Error reading cookie:", error);
    }
  }

  // SECURITY: If a user token was provided but verification failed, DENY ACCESS
  if (hadUserToken && !clerkUserId) {
    console.log("PostSignIn - SECURITY: Token verification failed, redirecting to home");
    redirect('/');
  }

  if (!clerkUserId) {
    console.log("PostSignIn - No user ID found, redirecting to home");
    redirect('/') // Shouldn't happen but good to handle
  }

  // SECURITY: Only proceed if token was verified
  if (!isTokenVerified) {
    console.log("PostSignIn - SECURITY: Token was not verified, redirecting to home");
    redirect('/');
  }

  const user = await getOrCreateUserFromClerk(clerkUserId);
  if (!user) {
    console.error("PostSignIn - getOrCreateUserFromClerk returned null");
    return <PostSignInError />;
  }
  console.log("PostSignIn - user ready:", user.id, user.isAdmin ? "(Admin)" : "", "email:", user.email);

  const userSaloons = await prismadb.saloon.findMany({
    where: {
      userId: user.id
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  // Always redirect to dashboard/saloons - server-side redirect maintains headers
  // The saloons page will show the appropriate UI (list or empty state)
  console.log("PostSignIn - user setup complete, redirecting to dashboard/saloons (has", userSaloons.length, "saloons)")
  redirect('/dashboard/saloons')
}
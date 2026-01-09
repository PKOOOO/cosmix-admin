// app/post-sign-in/page.tsx
import { auth, currentUser } from "@clerk/nextjs"
import { verifyToken } from "@clerk/backend"
import { redirect } from "next/navigation"
import { headers, cookies } from "next/headers"
import prismadb from "@/lib/prismadb"
import { isAuthorizedRequest, ADMIN_EXTERNAL_ID } from "@/lib/service-auth"
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
    // Use Clerk's verifyToken to validate the JWT
    // This checks the signature, expiration, etc.
    // Get issuer from env or construct from publishable key
    const issuer = process.env.CLERK_JWT_ISSUER ||
      (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.includes('pk_test_')
        ? `https://${process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.replace('pk_test_', '').replace('$', '')}.clerk.accounts.dev`
        : null);

    const verifiedToken = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
      issuer: issuer,
      clockSkewInMs: 300000, // Allow 5 minutes of clock skew
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

// Helper function to wait for user creation (in case webhook is delayed)
async function findUserWithRetry(clerkUserId: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const user = await prismadb.user.findUnique({
      where: { clerkId: clerkUserId }
    })

    if (user) return user

    // Wait 1 second before retrying (webhook might be processing)
    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  return null
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

  // Check if user has any saloons
  let user = await findUserWithRetry(clerkUserId)
  console.log("PostSignIn - user lookup result:", user ? `Found user ${user.id}` : "No user found")

  // If user doesn't exist in database, create them
  if (!user) {
    console.log("PostSignIn - user not found in database, creating user")
    // Get user details from Clerk to get real email
    let clerkUserEmail = `${clerkUserId}@clerk.local`;
    let clerkUserName = "New User";

    try {
      const clerkUser = await currentUser();
      if (clerkUser) {
        clerkUserEmail = clerkUser.emailAddresses[0]?.emailAddress || clerkUserEmail;
        clerkUserName = clerkUser.firstName && clerkUser.lastName
          ? `${clerkUser.firstName} ${clerkUser.lastName}`.trim()
          : clerkUser.firstName || clerkUser.lastName || clerkUserEmail.split('@')[0] || "New User";
      }
    } catch (error) {
      console.log("PostSignIn - Could not fetch Clerk user details:", error);
    }

    try {
      // Check if this is the first Clerk user (admin) - exclude service-admin
      const adminCount = await prismadb.user.count({
        where: {
          isAdmin: true,
          clerkId: { not: ADMIN_EXTERNAL_ID } // Exclude synthetic service user
        }
      });
      const isFirstUser = adminCount === 0;

      // Create user with real email and name from Clerk
      user = await prismadb.user.create({
        data: {
          clerkId: clerkUserId,
          email: clerkUserEmail,
          name: clerkUserName,
          isAdmin: isFirstUser, // Set admin status for first Clerk user
        }
      })
      console.log("PostSignIn - user created successfully:", user.id, isFirstUser ? "(Admin)" : "", "email:", user.email)
    } catch (error: any) {
      console.error("PostSignIn - error creating user:", error)
      // Handle unique constraint errors
      if (error.code === 'P2002') {
        console.log("PostSignIn - Unique constraint error, target:", error.meta?.target);

        // Check if it's a clerkId conflict (most common case)
        if (error.meta?.target?.includes('clerkId')) {
          // User with this clerkId already exists - fetch it
          user = await prismadb.user.findUnique({
            where: { clerkId: clerkUserId }
          });
          if (user) {
            console.log("PostSignIn - Found existing user by clerkId:", user.email);
          }
        }
        // Check if it's an email conflict
        else if (error.meta?.target?.includes('email')) {
          // User with this email already exists, try to find by email and update clerkId
          const existingUser = await prismadb.user.findUnique({
            where: { email: clerkUserEmail },
          });

          if (existingUser) {
            // If existing user doesn't have a clerkId, update it
            if (!existingUser.clerkId) {
              user = await prismadb.user.update({
                where: { email: clerkUserEmail },
                data: {
                  clerkId: clerkUserId,
                  name: clerkUserName,
                  // Don't change isAdmin if user already exists
                },
              });
              console.log("PostSignIn - Linked existing user to Clerk ID:", clerkUserId);
            } else {
              // User already has a clerkId, just use it
              user = existingUser;
              console.log("PostSignIn - Using existing user with different clerkId");
            }
          } else {
            // Email conflict but user not found - try finding by clerkId as fallback
            user = await prismadb.user.findUnique({
              where: { clerkId: clerkUserId }
            });
          }
        }

        // Final fallback: try to find by clerkId one more time
        if (!user) {
          user = await prismadb.user.findUnique({
            where: { clerkId: clerkUserId }
          });
        }

        if (user) {
          console.log("PostSignIn - found existing user after retry:", user.id)
        }
      }

      if (!user) {
        // If we still don't have a user, show error page
        console.error("PostSignIn - Could not create or find user after error handling");
        return <PostSignInError />
      }
    }
  }

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
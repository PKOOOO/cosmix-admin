// app/post-sign-in/page.tsx
import { auth, currentUser } from "@clerk/nextjs"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import prismadb from "@/lib/prismadb"
import { isAuthorizedRequest, ADMIN_EXTERNAL_ID } from "@/lib/service-auth"
import { PostSignInClient } from "./post-sign-in-client"
import { PostSignInError } from "./error-component"
import { setUserSession, getUserSession } from "@/lib/webview-session"

// Simple JWT decode (no verification needed for public claims like userId)
function decodeJWT(token: string): { sub?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload;
  } catch {
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

  if (isAuthorized) {
    try {
      // Extract Clerk user ID from X-User-Token header
      const headerPayload = headers();
      const clerkToken = headerPayload.get("x-user-token");

      if (clerkToken) {
        const decoded = decodeJWT(clerkToken);
        clerkUserId = decoded?.sub || null;
        console.log("PostSignIn - Clerk userId from bearer token:", clerkUserId);

        // Set session cookie so auth persists across redirects
        if (clerkUserId) {
          setUserSession(clerkUserId);
          console.log("PostSignIn - Set session cookie for:", clerkUserId);
        }
      }
    } catch (error) {
      console.log("PostSignIn - Error reading headers:", error);
      // Continue to fallback auth
    }
  }

  // Try session cookie if header didn't work
  if (!clerkUserId) {
    const sessionUserId = getUserSession();
    if (sessionUserId) {
      clerkUserId = sessionUserId;
      console.log("PostSignIn - Clerk userId from session cookie:", clerkUserId);
    }
  }

  // Fallback to Clerk auth if no service auth or session
  if (!clerkUserId) {
    const clerkAuth = auth();
    clerkUserId = clerkAuth?.userId || null;
    console.log("PostSignIn - Clerk userId from Clerk auth:", clerkUserId);
  }

  if (!clerkUserId) {
    console.log("PostSignIn - No user ID found, redirecting to home");
    redirect('/') // Shouldn't happen but good to handle
  }

  // Check if user has any saloons
  let user = await findUserWithRetry(clerkUserId)
  console.log("PostSignIn - user lookup result:", user ? `Found user ${user.id}` : "No user found")

  // If user doesn't exist in database, create them
  if (!user) {
    console.log("PostSignIn - user not found in database, creating user")
    // Get user details from Clerk to get real email
    let clerkUserEmail = `${clerkUserId}@temp.local`;
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
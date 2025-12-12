// app/post-sign-in/page.tsx
import { auth } from "@clerk/nextjs"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import prismadb from "@/lib/prismadb"
import { isAuthorizedRequest } from "@/lib/service-auth"
import { PostSignInClient } from "./post-sign-in-client"
import { PostSignInError } from "./error-component"

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
    // Extract Clerk user ID from X-User-Token header
    const headerPayload = headers();
    const clerkToken = headerPayload.get("x-user-token");
    
    if (clerkToken) {
      const decoded = decodeJWT(clerkToken);
      clerkUserId = decoded?.sub || null;
      console.log("PostSignIn - Clerk userId from bearer token:", clerkUserId);
    }
  }
  
  // Fallback to Clerk auth if no bearer token
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
    try {
      // Check if this is the first user (admin)
      const userCount = await prismadb.user.count();
      const isFirstUser = userCount === 0;

      // Create user with minimal info - we'll let the webhook handle full details
      // or update them later when we can get the full user info
      user = await prismadb.user.create({
        data: {
          clerkId: clerkUserId,
          email: `${clerkUserId}@temp.local`, // Temporary email with unique ID
          name: "New User", // Will be updated by webhook or later
          isAdmin: isFirstUser, // Set admin status for first user
        }
      })
      console.log("PostSignIn - user created successfully:", user.id, isFirstUser ? "(Admin)" : "")
    } catch (error) {
      console.error("PostSignIn - error creating user:", error)
      // Check if it's a unique constraint error (user already exists)
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        console.log("PostSignIn - user already exists, retrying lookup")
        user = await prismadb.user.findUnique({
          where: { clerkId: clerkUserId }
        })
        if (user) {
          console.log("PostSignIn - found existing user after retry:", user.id)
        }
      }
      
      if (!user) {
        // If we still don't have a user, show error page
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

  if (userSaloons.length > 0) {
    console.log("PostSignIn - user has saloons, redirecting to dashboard")
    redirect('/dashboard') // Redirect to dashboard without storeId
  }
  
  // If we reach here, user has no saloons. Show modal to create one.
  console.log("PostSignIn - no saloons found, showing modal to create one")
  return <PostSignInClient />
}
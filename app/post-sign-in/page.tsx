// app/post-sign-in/page.tsx
import { auth } from "@clerk/nextjs"
import { redirect } from "next/navigation"
import prismadb from "@/lib/prismadb"
import { PostSignInClient } from "./post-sign-in-client"

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
  const { userId: clerkUserId } = auth()
  
  console.log("PostSignIn - clerkUserId:", clerkUserId)
  
  if (!clerkUserId) {
    redirect('/') // Shouldn't happen but good to handle
  }

  let user = null
  
  try {
    // Try to find user with retry logic (handles webhook timing issues)
    user = await findUserWithRetry(clerkUserId)
    
    console.log("PostSignIn - user found:", user?.id)
    
  } catch (error) {
    console.error("PostSignIn - Database error:", error)
    // Continue execution - user will be null and we'll show the modal
  }

  // Handle redirect OUTSIDE of try-catch to avoid catching NEXT_REDIRECT
  if (!user) {
    console.log("PostSignIn - no user found in database")
    return <PostSignInClient />
  }

  // Check if ANY store exists in the database (shared store approach)
  const sharedStore = await prismadb.store.findFirst({
    orderBy: {
      createdAt: 'asc' // Get the first/oldest store
    }
  });

  if (sharedStore) {
    console.log("PostSignIn - redirecting to shared store:", sharedStore.id)
    redirect(`/${sharedStore.id}`) // Redirect to the shared store
  }
  
  console.log("PostSignIn - no store found, showing modal to create one")
  
  // If no store exists at all, render the client component that will open the modal
  return <PostSignInClient />
}
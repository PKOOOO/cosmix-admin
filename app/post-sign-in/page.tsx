// app/post-sign-in/page.tsx
import { auth } from "@clerk/nextjs"
import { redirect } from "next/navigation"
import prismadb from "@/lib/prismadb"
import { PostSignInClient } from "./post-sign-in-client"

// Helper function to wait for user creation (in case webhook is delayed)
async function findUserWithRetry(clerkUserId: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const user = await prismadb.user.findUnique({
      where: { clerkId: clerkUserId },
      include: {
        stores: true // Include stores in the query
      }
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
    console.log("PostSignIn - user stores:", user?.stores?.length || 0)
    
  } catch (error) {
    console.error("PostSignIn - Database error:", error)
    // Continue execution - user will be null and we'll show the modal
  }

  // Handle redirect OUTSIDE of try-catch to avoid catching NEXT_REDIRECT
  if (!user) {
    console.log("PostSignIn - no user found in database")
    return <PostSignInClient />
  }

  // Check if user has any stores and redirect if they do
  if (user.stores && user.stores.length > 0) {
    const firstStore = user.stores[0]
    console.log("PostSignIn - redirecting to store:", firstStore.id)
    redirect(`/${firstStore.id}`) // This will throw NEXT_REDIRECT - that's normal!
  }
  
  console.log("PostSignIn - no store found, showing modal")
  
  // If no store exists, render the client component that will open the modal
  return <PostSignInClient />
}
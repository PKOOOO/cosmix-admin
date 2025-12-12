import { ensureServiceUser, isAuthorizedRequest } from "./service-auth";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function checkAdminAccess() {
  // If bearer is present, allow service admin
  if (isAuthorizedRequest()) {
    const user = await ensureServiceUser();
    return { isAdmin: true, user };
  }

  // Otherwise, fall back to Clerk user: first real user becomes admin
  try {
    const { userId } = auth();
    if (!userId) return { isAdmin: false, user: null };

    // Check admin count BEFORE creating user to avoid race conditions
    const adminCount = await prismadb.user.count({ where: { isAdmin: true } });
    const shouldPromoteToAdmin = adminCount === 0;

    // Find or create the Clerk user in DB
    let user = await prismadb.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      try {
        user = await prismadb.user.create({
          data: {
            clerkId: userId,
            email: `${userId}@temp.local`,
            name: "New User",
            isAdmin: shouldPromoteToAdmin, // Set admin flag during creation
          },
        });
      } catch (createError: any) {
        // If user was created by another request, fetch it
        if (createError.code === 'P2002') {
          user = await prismadb.user.findUnique({
            where: { clerkId: userId },
          });
          if (!user) {
            console.error("Failed to create or find user:", createError);
            return { isAdmin: false, user: null };
          }
        } else {
          throw createError;
        }
      }
    }

    // If user exists but wasn't promoted and no admins exist, promote them
    if (user && !user.isAdmin && adminCount === 0) {
      // Double-check admin count before promoting (race condition protection)
      const currentAdminCount = await prismadb.user.count({ where: { isAdmin: true } });
      if (currentAdminCount === 0) {
        try {
          user = await prismadb.user.update({
            where: { id: user.id },
            data: { isAdmin: true },
          });
        } catch (updateError) {
          // If update fails, refetch user
          user = await prismadb.user.findUnique({
            where: { clerkId: userId },
          });
        }
      }
    }

    return { isAdmin: user?.isAdmin || false, user: user || null };
  } catch (error) {
    console.error("Error checking admin access:", error);
    return { isAdmin: false, user: null };
  }
}

export async function requireAdmin() {
  const { isAdmin, user } = await checkAdminAccess();
  
  if (!isAdmin) {
    throw new Error("Admin access required");
  }
  
  return user;
}

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

    // Find or create the Clerk user in DB
    let user = await prismadb.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      user = await prismadb.user.create({
        data: {
          clerkId: userId,
          email: `${userId}@temp.local`,
          name: "New User",
        },
      });
    }

    // If no admins exist yet, promote this user
    const adminCount = await prismadb.user.count({ where: { isAdmin: true } });
    if (adminCount === 0 && !user.isAdmin) {
      user = await prismadb.user.update({
        where: { id: user.id },
        data: { isAdmin: true },
      });
    }

    return { isAdmin: user.isAdmin, user };
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

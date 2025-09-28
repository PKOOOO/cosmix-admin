import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function checkAdminAccess() {
  const { userId } = auth();
  
  if (!userId) {
    return { isAdmin: false, user: null };
  }

  try {
    const user = await prismadb.user.findUnique({
      where: { clerkId: userId }
    });

    return { 
      isAdmin: user?.isAdmin || false, 
      user 
    };
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

import prismadb from "@/lib/prismadb";
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";

export async function checkSalonAccess() {
  const { userId } = auth();

  if (!userId) {
    redirect('/');
  }

  // Find the user in your database using the Clerk ID
  const user = await prismadb.user.findUnique({
    where: { 
      clerkId: userId 
    }
  });

  if (!user) {
    redirect('/');
  }

  // Check if user has any salons
  const userSaloons = await prismadb.saloon.findMany({
    where: {
      userId: user.id
    }
  });

  const hasSaloons = userSaloons.length > 0;

  if (!hasSaloons) {
    // Redirect to saloons page to create a salon
    redirect('/dashboard/saloons');
  }

  return { user, hasSaloons, userSaloons };
}

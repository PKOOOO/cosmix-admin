import prismadb from "@/lib/prismadb";
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";

export async function checkSalonAccess(storeId: string) {
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

  // Check if user has any salons in this store
  const userSaloons = await prismadb.saloon.findMany({
    where: {
      userId: user.id,
      storeId: storeId
    }
  });

  const hasSaloons = userSaloons.length > 0;

  if (!hasSaloons) {
    // Redirect to saloons page to create a salon
    redirect(`/${storeId}/saloons`);
  }

  return { user, hasSaloons, userSaloons };
}

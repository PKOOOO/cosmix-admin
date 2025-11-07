// app/dashboard/layout.tsx
import prismadb from "@/lib/prismadb";
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import NextTopLoader from 'nextjs-toploader';
import { DashboardNavbar } from "@/components/dashboard-navbar";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
   const { userId } = auth(); // This is the Clerk user ID

   if (!userId) {
    redirect('/');
   }

   // Find the user in your database using the Clerk ID
   const user = await prismadb.user.findUnique({
    where: { 
        clerkId: userId 
    }
   });

   let finalUser = user;
   if (!user) {
    // Add a small delay and retry once before redirecting
    await new Promise(resolve => setTimeout(resolve, 500));
    const retryUser = await prismadb.user.findUnique({
      where: { 
          clerkId: userId 
      }
    });
    
    if (!retryUser) {
      redirect('/post-sign-in');
    }
    finalUser = retryUser;
   }

   // Check if user has any saloons
   const userSaloons = await prismadb.saloon.findMany({
    where: {
        userId: finalUser!.id
    }
   });

   const hasSaloons = userSaloons.length > 0;

   return (
    <>
        <NextTopLoader
          color="#423120"
          height={3}
          showSpinner={false}
          shadow="0 0 10px #423120,0 0 5px #423120"
        />
        <DashboardNavbar hasSaloons={hasSaloons} />
        <div className="w-full max-w-full overflow-hidden relative">
          <main className="p-0 md:p-6 w-full max-w-full overflow-hidden pt-16 md:pt-0">
            {children}
          </main>
        </div>
    </>
   );
};

// app/dashboard/layout.tsx
import Navbar from "@/components/navbar";
import prismadb from "@/lib/prismadb";
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import NextTopLoader from 'nextjs-toploader';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

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
          color="#3b82f6"
          height={3}
          showSpinner={false}
          shadow="0 0 10px #3b82f6,0 0 5px #3b82f6"
        />
        <SidebarProvider>
          <AppSidebar hasSaloons={hasSaloons} />
          <div className="flex-1 w-full max-w-full overflow-hidden relative">
            <Navbar />
            <main className="pt-20 p-3 md:p-6 w-full max-w-full overflow-hidden">
              {children}
            </main>
          </div>
        </SidebarProvider>
    </>
   );
};

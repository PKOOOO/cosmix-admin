// app\(dashboard)\[storeId]\layout.tsx
import Navbar from "@/components/navbar";
import prismadb from "@/lib/prismadb";
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import NextTopLoader from 'nextjs-toploader';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default async function DashboardLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: { storeId: string }
}) {
   const { userId } = auth(); // This is the Clerk user ID

   if (!userId) {
    redirect('/');
   }

   // First, find the user in your database using the Clerk ID
   const user = await prismadb.user.findUnique({
    where: { 
        clerkId: userId 
    }
   });

   if (!user) {
    redirect('/');
   }

   // Now find the store using the database user ID
   const store = await prismadb.store.findFirst({
    where: {
        id: params.storeId,
        userId: user.id // Use the database user ID, not Clerk ID
    }
   });

   if(!store) {
    redirect('/');
   }

   // Also fix the stores query for the sidebar
   const stores = await prismadb.store.findMany({
    where: {
        userId: user.id, // Use the database user ID here too
    },
   });

   return (
    <>
        <NextTopLoader
          color="#3b82f6"
          height={3}
          showSpinner={false}
          shadow="0 0 10px #3b82f6,0 0 5px #3b82f6"
        />
        <SidebarProvider>
          <AppSidebar stores={stores} />
          <div className="flex-1">
            <Navbar />
            <main className="p-6">
              {children}
            </main>
          </div>
        </SidebarProvider>
    </>
   );
};
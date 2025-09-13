// app/(dashboard)/[storeId]/layout.tsx
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

   // Optional: find the user in your database using the Clerk ID
   // Do not block access if the user record hasn't been created yet (shared store access)
   const user = await prismadb.user.findUnique({
    where: { 
        clerkId: userId 
    }
   });

   // Check if the store exists (remove ownership check for shared store)
   const store = await prismadb.store.findUnique({
    where: {
        id: params.storeId
    }
   });

   if (!store) {
    redirect('/');
   }

   // Get all stores for the sidebar (all users can see all stores)
   const stores = await prismadb.store.findMany({
    orderBy: {
        createdAt: 'asc'
    }
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
            <main className="p-3 md:p-6">
              {children}
            </main>
          </div>
        </SidebarProvider>
    </>
   );
};
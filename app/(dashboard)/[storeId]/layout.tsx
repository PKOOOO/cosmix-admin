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

   // Find the user in your database using the Clerk ID
   const user = await prismadb.user.findUnique({
    where: { 
        clerkId: userId 
    }
   });

   // Check if the store exists
   const store = await prismadb.store.findUnique({
    where: {
        id: params.storeId
    }
   });

   if (!store) {
    redirect('/');
   }

   // Check if user has any salons in this store
   const userSaloons = user ? await prismadb.saloon.findMany({
    where: {
        userId: user.id,
        storeId: params.storeId
    }
   }) : [];

   const hasSaloons = userSaloons.length > 0;

   // Check if current route should be restricted for users without salons
   const restrictedRoutes = ['/services', '/bookings', '/categories', '/settings'];
   const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
   
   // For server-side, we need to check the pathname differently
   // This will be handled in individual page components

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
          <AppSidebar stores={stores} hasSaloons={hasSaloons} />
          <div className="flex-1 w-full max-w-full overflow-hidden">
            <Navbar />
            <main className="p-3 md:p-6 w-full max-w-full overflow-hidden">
              {children}
            </main>
          </div>
        </SidebarProvider>
    </>
   );
};
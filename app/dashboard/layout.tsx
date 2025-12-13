import prismadb from "@/lib/prismadb";
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import NextTopLoader from 'nextjs-toploader';
import { DashboardNavbar } from "@/components/dashboard-navbar";
import { isAuthorizedRequest } from "@/lib/service-auth";
import { checkAdminAccess } from "@/lib/admin-access";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await checkAdminAccess();

  if (!user) {
    console.log('[DASHBOARD_LAYOUT] No user found, redirecting to home');
    redirect('/');
  }

  // Check if user has any saloons
  const userSaloons = await prismadb.saloon.findMany({
    where: {
      userId: user.id
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
        <main className="p-0 md:p-6 w-full max-w-full overflow-hidden pt-16 md:pt-0 pb-20 md:pb-6">
          {children}
        </main>
      </div>
    </>
  );
};

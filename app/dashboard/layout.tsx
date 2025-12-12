// app/dashboard/layout.tsx
import prismadb from "@/lib/prismadb";
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import NextTopLoader from 'nextjs-toploader';
import { DashboardNavbar } from "@/components/dashboard-navbar";
import { isAuthorizedRequest } from "@/lib/service-auth";

// Simple JWT decode (no verification needed for public claims like userId)
function decodeJWT(token: string): { sub?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload;
  } catch {
    return null;
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check for bearer token authentication first (from WebView)
  const isAuthorized = isAuthorizedRequest();
  let clerkUserId: string | null = null;
  
  if (isAuthorized) {
    // Extract Clerk user ID from X-User-Token header
    const headerPayload = headers();
    const clerkToken = headerPayload.get("x-user-token");
    
    if (clerkToken) {
      const decoded = decodeJWT(clerkToken);
      clerkUserId = decoded?.sub || null;
      console.log('[DASHBOARD_LAYOUT] Clerk userId from bearer token:', clerkUserId);
    }
  }
  
  // Fallback to Clerk auth if no bearer token
  if (!clerkUserId) {
    try {
      const clerkAuth = auth();
      clerkUserId = clerkAuth?.userId || null;
      console.log('[DASHBOARD_LAYOUT] Clerk userId from Clerk auth:', clerkUserId);
    } catch (error) {
      console.log('[DASHBOARD_LAYOUT] Clerk auth failed:', error);
    }
  }

  if (!clerkUserId) {
    console.log('[DASHBOARD_LAYOUT] No user ID found, redirecting to home');
    redirect('/');
  }

  // Find the user in your database using the Clerk ID
  const user = await prismadb.user.findUnique({
    where: {
      clerkId: clerkUserId
    }
  });

  let finalUser = user;
  if (!user) {
    // Add a small delay and retry once before redirecting
    await new Promise(resolve => setTimeout(resolve, 500));
    const retryUser = await prismadb.user.findUnique({
      where: {
        clerkId: clerkUserId
      }
    });

    if (!retryUser) {
      console.log('[DASHBOARD_LAYOUT] User not found after retry, redirecting to post-sign-in');
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
        <main className="p-0 md:p-6 w-full max-w-full overflow-hidden pt-16 md:pt-0 pb-20 md:pb-6">
          {children}
        </main>
      </div>
    </>
  );
};

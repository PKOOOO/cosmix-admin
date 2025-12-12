import { redirect } from "next/navigation";
import { checkAdminAccess } from "@/lib/admin-access";
import { isAuthorizedRequest } from "@/lib/service-auth";
import NextTopLoader from 'nextjs-toploader';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check for bearer token or Clerk auth
  const isAuthorized = isAuthorizedRequest();
  
  // If no bearer token, checkAdminAccess will check Clerk auth
  // But we still need to ensure some form of auth exists
  const { isAdmin, user } = await checkAdminAccess();
  
  if (!user) {
    // No user found at all, redirect to home
    redirect('/');
  }
  
  if (!isAdmin) {
    // User exists but is not admin, redirect to dashboard
    redirect('/dashboard');
  }

  return (
    <>
      <NextTopLoader
        color="#3b82f6"
        height={3}
        showSpinner={false}
        shadow="0 0 10px #3b82f6,0 0 5px #3b82f6"
      />
      <div className="min-h-screen bg-background">        
        {/* Admin Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </>
  );
}

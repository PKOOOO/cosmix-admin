import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { checkAdminAccess } from "@/lib/admin-access";
import NextTopLoader from 'nextjs-toploader';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = auth();
  
  if (!userId) {
    redirect('/');
  }

  const { isAdmin } = await checkAdminAccess();
  
  if (!isAdmin) {
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

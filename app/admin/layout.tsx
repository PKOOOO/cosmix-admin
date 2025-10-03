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
        {/* Admin Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center px-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">A</span>
                </div>
                <div>
                  <h1 className="text-lg font-semibold">Admin Panel</h1>
                  <p className="text-sm text-muted-foreground">Manage global categories and services</p>
                </div>
              </div>
            </div>
            <div className="ml-auto flex items-center space-x-4">
              <a 
                href="/dashboard" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to Dashboard
              </a>
            </div>
          </div>
        </header>
        
        {/* Admin Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </>
  );
}

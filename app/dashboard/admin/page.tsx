import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { checkAdminAccess } from "@/lib/admin-access";
import { AdminClient } from "./components/admin-client";

export default async function AdminPage() {
  const { userId } = auth();
  
  if (!userId) {
    redirect('/');
  }

  const { isAdmin } = await checkAdminAccess();
  
  if (!isAdmin) {
    redirect('/dashboard');
  }

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <AdminClient />
      </div>
    </div>
  );
}

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
    <div className="p-6">
      <AdminClient />
    </div>
  );
}

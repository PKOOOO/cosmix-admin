import { checkAdminAccess } from "@/lib/admin-access";
import { redirect } from "next/navigation";
import { AdminClient } from "./components/admin-client";

export default async function AdminPage() {
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

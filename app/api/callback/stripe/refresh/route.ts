import { redirect } from "next/navigation";

export async function GET() {
  // Redirect back to integration page to retry the connection
  redirect("/dashboard/integration?stripe=refresh");
}


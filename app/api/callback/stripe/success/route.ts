import { redirect } from "next/navigation";

export async function GET() {
  redirect("/dashboard/integration?stripe=connected");
}


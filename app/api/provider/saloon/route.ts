import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { checkAdminAccess } from "@/lib/admin-access";

// GET /api/provider/saloon
// Returns the provider's saloon, creating it if it doesn't exist yet.
// Safe to call multiple times (idempotent).
export async function GET() {
  try {
    const { user } = await checkAdminAccess();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let saloon = await prismadb.saloon.findFirst({
      where: { userId: user.id },
    });

    if (!saloon) {
      let appName: string | null = null;
      let appAddress: string | null = null;

      try {
        const application = await prismadb.providerApplication.findUnique({
          where: { userId: user.id },
        });
        appName = application?.businessName
          ?? `${application?.firstName ?? ""} ${application?.lastName ?? ""}`.trim()
          || null;
        appAddress = application?.address ?? null;
      } catch {}

      saloon = await prismadb.saloon.create({
        data: {
          name: appName || user.name || "My Salon",
          userId: user.id,
          address: appAddress,
        },
      });
    }

    return NextResponse.json(saloon);
  } catch (error) {
    console.error("[PROVIDER_SALOON_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const runtime = "nodejs";

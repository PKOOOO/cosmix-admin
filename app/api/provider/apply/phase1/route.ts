import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { checkAdminAccess } from "@/lib/admin-access";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Token",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const { user } = await checkAdminAccess();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const { firstName, lastName, phone, city, address, serviceCategories, neighbourhood } = body;

    if (!firstName || !lastName || !phone || !city || !address || !serviceCategories?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: corsHeaders });
    }

    const application = await prismadb.providerApplication.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        firstName,
        lastName,
        phone,
        city,
        neighbourhood: neighbourhood ?? null,
        address,
        serviceCategories,
        currentPhase: 1,
      },
      update: {
        firstName,
        lastName,
        phone,
        city,
        neighbourhood: neighbourhood ?? null,
        address,
        serviceCategories,
      },
    });

    await prismadb.user.update({
      where: { id: user.id },
      data: { providerStatus: "PHASE1_PENDING" },
    });

    return NextResponse.json({ success: true, application }, { headers: corsHeaders });
  } catch (error) {
    console.error("[PROVIDER_APPLY_PHASE1]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

export const runtime = "nodejs";

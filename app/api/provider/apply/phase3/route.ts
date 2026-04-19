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

export async function POST() {
  try {
    const { user } = await checkAdminAccess();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    // Enforce phase order — must be PHASE2_APPROVED before submitting phase 3
    const dbUser = await prismadb.user.findUnique({
      where: { id: user.id },
      select: { providerStatus: true },
    });

    if (dbUser?.providerStatus !== "PHASE2_APPROVED") {
      return NextResponse.json(
        { error: "Phase 2 must be approved before submitting Phase 3" },
        { status: 403, headers: corsHeaders }
      );
    }

    // Verify provider has at least one service on their saloon
    const saloon = await prismadb.saloon.findFirst({
      where: { userId: user.id },
      include: { _count: { select: { saloonServices: true } } },
    });

    if (!saloon || saloon._count.saloonServices === 0) {
      return NextResponse.json(
        { error: "Add at least one service before submitting" },
        { status: 400, headers: corsHeaders }
      );
    }

    await prismadb.providerApplication.update({
      where: { userId: user.id },
      data: { currentPhase: 3 },
    });

    await prismadb.user.update({
      where: { id: user.id },
      data: { providerStatus: "PHASE3_PENDING" },
    });

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error("[PROVIDER_APPLY_PHASE3]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

export const runtime = "nodejs";

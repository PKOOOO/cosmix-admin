import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { getEndUser } from "@/lib/admin-access";

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
    const user = await getEndUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const dbUser = await prismadb.user.findUnique({
      where: { id: user.id },
      select: { providerStatus: true },
    });

    if (dbUser?.providerStatus !== "PHASE2_APPROVED") {
      return NextResponse.json(
        { error: "Phase 2 must be approved before completing salon setup" },
        { status: 403, headers: corsHeaders }
      );
    }

    await prismadb.providerApplication.update({
      where: { userId: user.id },
      data: { currentPhase: 3 },
    });

    await prismadb.user.update({
      where: { id: user.id },
      data: { providerStatus: "ACTIVE" },
    });

    return NextResponse.json({ success: true, status: "ACTIVE" }, { headers: corsHeaders });
  } catch (error) {
    console.error("[PROVIDER_APPLY_PHASE3]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

export const runtime = "nodejs";

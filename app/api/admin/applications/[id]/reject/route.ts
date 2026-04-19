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

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { isAdmin, user } = await checkAdminAccess();
    if (!user || !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
    }

    const { reason } = await req.json();
    if (!reason?.trim()) {
      return NextResponse.json({ error: "Rejection reason required" }, { status: 400, headers: corsHeaders });
    }

    const application = await prismadb.providerApplication.findUnique({
      where: { id: params.id },
    });

    if (!application) {
      return NextResponse.json({ error: "Not found" }, { status: 404, headers: corsHeaders });
    }

    await prismadb.user.update({
      where: { id: application.userId },
      data: { providerStatus: "REJECTED" as any },
    });

    await prismadb.providerApplication.update({
      where: { id: params.id },
      data: { rejectedReason: reason.trim() },
    });

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error("[ADMIN_APPLICATION_REJECT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

export const runtime = "nodejs";

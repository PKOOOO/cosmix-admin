import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { checkAdminAccess } from "@/lib/admin-access";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Token",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
  try {
    const { isAdmin, user } = await checkAdminAccess();
    if (!user || !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
    }

    const applications = await prismadb.providerApplication.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true, providerStatus: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ applications }, { headers: corsHeaders });
  } catch (error) {
    console.error("[ADMIN_APPLICATIONS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

export const runtime = "nodejs";

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
    const { user } = await checkAdminAccess();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const dbUser = await prismadb.user.findUnique({
      where: { id: user.id },
      select: {
        providerStatus: true,
        application: true,
      },
    });

    return NextResponse.json(
      {
        status: dbUser?.providerStatus ?? "NOT_APPLIED",
        application: dbUser?.application ?? null,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[PROVIDER_APPLY_STATUS]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

export const runtime = "nodejs";

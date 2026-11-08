import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { requireHumanAdmin, ALL_PAYOUT_STATUSES } from "@/lib/payouts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Token",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// GET /api/admin/payouts?status=transferred — newest first. Payouts are
// created by providers' Stripe withdrawals; there is no manual payout run.
export async function GET(req: Request) {
  const admin = await requireHumanAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });

  try {
    const status = new URL(req.url).searchParams.get("status");
    const payouts = await prismadb.payout.findMany({
      where: status && (ALL_PAYOUT_STATUSES as readonly string[]).includes(status) ? { status } : undefined,
      orderBy: { scheduledFor: "desc" },
      take: 200,
      include: {
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { bookings: true } },
      },
    });
    return NextResponse.json(payouts, { headers: corsHeaders });
  } catch (error) {
    console.error("[ADMIN_PAYOUTS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

export const runtime = "nodejs";

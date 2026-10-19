import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { requireHumanAdmin, runPayouts, PAYOUT_STATUSES } from "@/lib/payouts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Token",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// GET /api/admin/payouts?status=scheduled — newest first.
export async function GET(req: Request) {
  const admin = await requireHumanAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });

  try {
    const status = new URL(req.url).searchParams.get("status");
    const payouts = await prismadb.payout.findMany({
      where: status && (PAYOUT_STATUSES as readonly string[]).includes(status) ? { status } : undefined,
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

// POST /api/admin/payouts — run the payout batch now (same as the weekly cron).
export async function POST() {
  const admin = await requireHumanAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });

  try {
    const result = await runPayouts();
    return NextResponse.json(result, { headers: corsHeaders });
  } catch (error) {
    console.error("[ADMIN_PAYOUTS_RUN]", error);
    return NextResponse.json({ error: "Payout run failed" }, { status: 500, headers: corsHeaders });
  }
}

export const runtime = "nodejs";

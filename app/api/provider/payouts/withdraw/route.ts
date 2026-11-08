import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { getEndUser } from "@/lib/admin-access";
import { withdrawBalance } from "@/lib/stripe-connect";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Token",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// POST /api/provider/payouts/withdraw - sends the available balance to the
// provider's Stripe account (see withdrawBalance in lib/stripe-connect.ts).
export async function POST() {
  try {
    const user = await getEndUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    const saloon = await prismadb.saloon.findFirst({ where: { userId: user.id }, select: { id: true } });
    if (!saloon) return NextResponse.json({ error: "No saloon found" }, { status: 404, headers: corsHeaders });

    const result = await withdrawBalance(user, saloon.id);
    if (!result.ok) {
      const status = result.reason === "all_transfers_failed" ? 502 : 409;
      return NextResponse.json({ error: result.message, reason: result.reason }, { status, headers: corsHeaders });
    }
    return NextResponse.json(result, { headers: corsHeaders });
  } catch (error) {
    console.error("[PROVIDER_WITHDRAW]", error);
    return NextResponse.json({ error: "Withdrawal failed. Please try again." }, { status: 500, headers: corsHeaders });
  }
}

export const runtime = "nodejs";

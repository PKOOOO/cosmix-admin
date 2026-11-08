import { NextResponse } from "next/server";
import { getEndUser } from "@/lib/admin-access";
import { dashboardLink } from "@/lib/stripe-connect";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Token",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// POST /api/provider/stripe/dashboard -> { url } of the provider's Stripe
// dashboard (payouts to their bank, statements). Links are single-use.
export async function POST() {
  try {
    const user = await getEndUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    if (!user.stripeAccountId || !user.stripeDetailsSubmitted) {
      return NextResponse.json({ error: "Finish setting up payouts first." }, { status: 409, headers: corsHeaders });
    }
    const url = await dashboardLink(user.stripeAccountId);
    return NextResponse.json({ url }, { headers: corsHeaders });
  } catch (error) {
    console.error("[PROVIDER_STRIPE_DASHBOARD]", error);
    return NextResponse.json({ error: "Could not open Stripe. Please try again." }, { status: 502, headers: corsHeaders });
  }
}

export const runtime = "nodejs";

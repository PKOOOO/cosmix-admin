import { NextResponse } from "next/server";
import { getEndUser } from "@/lib/admin-access";
import { syncStripeStatus } from "@/lib/stripe-connect";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Token",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// GET /api/provider/stripe - the provider's Stripe payout account status,
// read fresh from Stripe (the app calls it after onboarding returns).
export async function GET() {
  try {
    const user = await getEndUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    const status = await syncStripeStatus(user);
    return NextResponse.json(status, { headers: corsHeaders });
  } catch (error) {
    console.error("[PROVIDER_STRIPE_GET]", error);
    return NextResponse.json({ error: "Could not reach Stripe" }, { status: 502, headers: corsHeaders });
  }
}

export const runtime = "nodejs";

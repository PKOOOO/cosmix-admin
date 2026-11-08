import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { getEndUser } from "@/lib/admin-access";
import { ensureStripeAccount, onboardingLink } from "@/lib/stripe-connect";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Token",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// POST /api/provider/stripe/onboard -> { url } of Stripe-hosted onboarding.
// Creates the provider's Stripe account the first time. Only providers with a
// salon can set up payouts.
export async function POST() {
  try {
    const user = await getEndUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    const saloon = await prismadb.saloon.findFirst({ where: { userId: user.id }, select: { id: true } });
    if (!saloon) return NextResponse.json({ error: "No saloon found" }, { status: 404, headers: corsHeaders });

    const accountId = await ensureStripeAccount(user);
    const url = await onboardingLink(accountId);
    return NextResponse.json({ url }, { headers: corsHeaders });
  } catch (error) {
    console.error("[PROVIDER_STRIPE_ONBOARD]", error);
    return NextResponse.json({ error: "Could not start Stripe setup. Please try again." }, { status: 502, headers: corsHeaders });
  }
}

export const runtime = "nodejs";

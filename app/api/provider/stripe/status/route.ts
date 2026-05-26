import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { checkAdminAccess } from "@/lib/admin-access";
import { stripe } from "@/lib/stripe";

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
      select: { stripeId: true, stripeAccountStatus: true },
    });

    if (!dbUser?.stripeId) {
      return NextResponse.json(
        { stripeAccountId: null, stripeAccountStatus: "none" },
        { headers: corsHeaders },
      );
    }

    // Refresh status from Stripe so the UI reflects the real verification state
    let liveStatus = dbUser.stripeAccountStatus ?? "incomplete";
    let chargesEnabled = false;
    let payoutsEnabled = false;
    try {
      const account = await stripe.accounts.retrieve(dbUser.stripeId);
      chargesEnabled = !!account.charges_enabled;
      payoutsEnabled = !!account.payouts_enabled;
      liveStatus = chargesEnabled && payoutsEnabled ? "active" : "incomplete";

      if (liveStatus !== dbUser.stripeAccountStatus) {
        await prismadb.user.update({
          where: { id: user.id },
          data: { stripeAccountStatus: liveStatus },
        });
      }
    } catch (e) {
      console.error("[PROVIDER_STRIPE_STATUS] retrieve failed:", e);
    }

    return NextResponse.json(
      {
        stripeAccountId: dbUser.stripeId,
        stripeAccountStatus: liveStatus,
        chargesEnabled,
        payoutsEnabled,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error("[PROVIDER_STRIPE_STATUS]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

export const runtime = "nodejs";

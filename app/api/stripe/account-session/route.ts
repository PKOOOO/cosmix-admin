import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { checkAdminAccess } from "@/lib/admin-access";
import prismadb from "@/lib/prismadb";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Token",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// GET — check current Stripe account status
export async function GET() {
  try {
    const { user } = await checkAdminAccess();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    if (!user.stripeId) {
      return NextResponse.json({ status: "not_connected" }, { headers: corsHeaders });
    }

    const account = await stripe.accounts.retrieve(user.stripeId);
    return NextResponse.json(
      {
        status: account.details_submitted ? "active" : "incomplete",
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[ACCOUNT_SESSION_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST — create or retrieve account + return AccountSession client_secret
export async function POST() {
  try {
    const { user } = await checkAdminAccess();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    let stripeId = user.stripeId;

    if (!stripeId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "FI",
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          userId: user.id,
          clerkId: user.clerkId,
        },
      });

      await prismadb.user.update({
        where: { id: user.id },
        data: { stripeId: account.id },
      });

      stripeId = account.id;
    }

    const accountSession = await stripe.accountSessions.create({
      account: stripeId,
      components: {
        account_onboarding: { enabled: true },
      },
    });

    return NextResponse.json(
      { client_secret: accountSession.client_secret },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[ACCOUNT_SESSION_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { checkAdminAccess } from "@/lib/admin-access";
import prismadb from "@/lib/prismadb";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Token",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// POST — create an AccountSession for the authenticated user's Stripe account.
// The Stripe account ID is derived from the user's record; not accepted from the body.
export async function POST() {
  try {
    const { user } = await checkAdminAccess();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: corsHeaders }
      );
    }

    const dbUser = await prismadb.user.findUnique({
      where: { id: user.id },
      select: { stripeId: true },
    });

    if (!dbUser?.stripeId) {
      return NextResponse.json(
        { error: "No Stripe account on file" },
        { status: 400, headers: corsHeaders }
      );
    }

    const session = await stripe.accountSessions.create({
      account: dbUser.stripeId,
      components: {
        account_onboarding: { enabled: true },
      },
    });

    return NextResponse.json(
      { clientSecret: session.client_secret },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("[AccountSession] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create session" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export const runtime = "nodejs";

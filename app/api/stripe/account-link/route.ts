import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { checkAdminAccess } from "@/lib/admin-access";
import { stripe } from "@/lib/stripe";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Token",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST() {
  try {
    const { user } = await checkAdminAccess();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const dbUser = await prismadb.user.findUnique({
      where: { id: user.id },
      select: { stripeId: true },
    });

    if (!dbUser?.stripeId) {
      return NextResponse.json(
        { error: "No Stripe account on file" },
        { status: 400, headers: corsHeaders },
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://cosmix-admin-one.vercel.app";

    const accountLink = await stripe.accountLinks.create({
      account: dbUser.stripeId,
      refresh_url: `${baseUrl}/dashboard/integration?refresh=1`,
      return_url: `${baseUrl}/dashboard/integration?return=1`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url }, { headers: corsHeaders });
  } catch (error) {
    console.error("[STRIPE_ACCOUNT_LINK]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

export const runtime = "nodejs";

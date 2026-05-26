import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
    const { accountId } = await req.json();

    if (!accountId) {
      return NextResponse.json(
        { error: "accountId is required" },
        { status: 400 }
      );
    }

    console.log("[AccountSession] Creating for account:", accountId);

    const session = await stripe.accountSessions.create({
      account: accountId,
      components: {
        account_onboarding: {
          enabled: true,
          features: {
            disable_stripe_user_authentication: true,
          },
        },
      },
    });

    console.log("[AccountSession] Created, expires_at:", session.expires_at);

    return NextResponse.json({
      clientSecret: session.client_secret,
    });
  } catch (error: any) {
    console.error("[AccountSession] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create session" },
      { status: 500 }
    );
  }
}

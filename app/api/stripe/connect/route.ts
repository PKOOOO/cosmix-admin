import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { stripe } from "@/lib/stripe";

export async function GET(req: NextRequest) {
  try {
    // Debug: Check if Stripe is properly configured
    console.log("Stripe API Key exists:", !!process.env.STRIPE_SECRET_KEY);
    console.log("Stripe instance created:", !!stripe);
    
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Find the user in the database
    const user = await prismadb.user.findUnique({
      where: { clerkId: userId }
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Create Stripe Connect account link
    const accountLink = await stripe.accountLinks.create({
      account: user.stripeId || undefined,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/integration`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/success`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error("Error creating Stripe Connect link:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

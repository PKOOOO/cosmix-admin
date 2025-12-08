import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import prismadb from "@/lib/prismadb";
import { headers } from "next/headers";

// Connect to Stripe
export async function GET() {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return new NextResponse("STRIPE_SECRET_KEY is not configured", { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-11-17.clover",
      typescript: true,
    });

    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    // Get the user from database
    const user = await prismadb.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Get the base URL from headers for dynamic callback URLs
    const headersList = headers();
    const host = headersList.get("host") || "localhost:3000";
    const protocol = headersList.get("x-forwarded-proto") || "http";
    const baseUrl = `${protocol}://${host}`;

    let accountId = user.stripeId;

    // If user already has a Stripe account, check if onboarding is complete
    if (accountId) {
      const account = await stripe.accounts.retrieve(accountId);
      
      // If onboarding is complete, no need to create a new link
      if (account.details_submitted) {
        return NextResponse.json({
          message: "Stripe account already connected",
          connected: true,
        });
      }
      
      // If onboarding not complete, create a new onboarding link
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${baseUrl}/callback/stripe/refresh`,
        return_url: `${baseUrl}/callback/stripe/success`,
        type: "account_onboarding",
        collection_options: {
          fields: "eventually_due",
          future_requirements: "omit",
        },
      });

      return NextResponse.json({ url: accountLink.url });
    }

    // Create a new Stripe Express account (recommended for most platforms)
    // Express accounts are easier to manage - Stripe handles compliance & onboarding
    const account = await stripe.accounts.create({
      type: "express",
      country: "FI",
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual",
      business_profile: {
        url: "https://cosmix.fi",
      },
      metadata: {
        userId: user.id,
        clerkId: userId,
      },
    });

    // Save the Stripe account ID to the user
    await prismadb.user.update({
      where: { clerkId: userId },
      data: { stripeId: account.id },
    });

    // Create an account onboarding link
    // Using 'eventually_due' defers non-critical fields to speed up onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${baseUrl}/callback/stripe/refresh`,
      return_url: `${baseUrl}/callback/stripe/success`,
      type: "account_onboarding",
      collection_options: {
        fields: "eventually_due",
        future_requirements: "omit",
      },
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error("An error occurred when connecting to Stripe:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// Disconnect from Stripe
export async function DELETE() {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return new NextResponse("STRIPE_SECRET_KEY is not configured", { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-11-17.clover",
      typescript: true,
    });

    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    // Get the user from database
    const user = await prismadb.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    if (!user.stripeId) {
      return new NextResponse("No Stripe account connected", { status: 400 });
    }

    // Delete the Stripe account (this removes it from your platform)
    // Note: This doesn't delete the user's Stripe account entirely,
    // it just disconnects them from your platform
    try {
      await stripe.accounts.del(user.stripeId);
    } catch (stripeError: any) {
      // If the account doesn't exist on Stripe, that's okay - just remove from DB
      if (stripeError.code !== "resource_missing") {
        throw stripeError;
      }
    }

    // Remove the Stripe ID from the user
    await prismadb.user.update({
      where: { clerkId: userId },
      data: { stripeId: null },
    });

    return NextResponse.json({ 
      message: "Stripe account disconnected successfully",
      disconnected: true 
    });
  } catch (error) {
    console.error("An error occurred when disconnecting Stripe:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

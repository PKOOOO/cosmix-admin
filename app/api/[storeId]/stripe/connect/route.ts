import { auth, currentUser } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import prismadb from "@/lib/prismadb";

const stripe = new Stripe(process.env.STRIPE_API_KEY!, {
    typescript: true,
    apiVersion: "2025-08-27.basil", // Use the version that matches the package
})

export async function GET() {
    try {
        // Check environment variables
        if (!process.env.STRIPE_API_KEY) {
            console.error("STRIPE_API_KEY is not set");
            return new NextResponse("Stripe configuration error", { status: 500 });
        }
        
        if (!process.env.NEXT_PUBLIC_APP_URL) {
            console.error("NEXT_PUBLIC_APP_URL is not set");
            return new NextResponse("App URL configuration error", { status: 500 });
        }

        const { userId } = auth();
        if (!userId) {
            console.log("No user found in auth()");
            return new NextResponse("Unauthorized", { status: 401 });
        }
        
        console.log("User found:", userId);

        // Ensure the Clerk user exists in our DB (create on the fly if missing)
        let user = await prismadb.user.findUnique({ where: { clerkId: userId } });
        if (!user) {
            const cu = await currentUser();
            const email = cu?.emailAddresses?.[0]?.emailAddress;
            if (!email) return new NextResponse("User email missing", { status: 401 });
            user = await prismadb.user.create({
                data: {
                    clerkId: userId,
                    email,
                    name: cu?.firstName || cu?.username || null,
                },
            });
        }

        console.log("Creating Stripe Express account...");
        const account = await stripe.accounts.create({
            country: "US",
            type: "express", // Use Express accounts for easier onboarding
            capabilities: {
                card_payments: {
                    requested: true,
                },
                transfers: {
                    requested: true,
                },
            },
            // Remove tos_acceptance for Express accounts - Stripe handles this during onboarding
        })
        
        console.log("Stripe account created:", account.id);
        
        if (account) {
            // Save the account ID to the user
            console.log("Saving account ID to database...");
            const saveAccountId = await prismadb.user.update({
                where: {
                    clerkId: userId,
                },
                data: {
                    stripeId: account.id,
                },
            })

            console.log("Account ID saved to database");

            if (saveAccountId) {
                // Create account link for onboarding
                console.log("Creating account link...");
                const accountLink = await stripe.accountLinks.create({
                    account: account.id,
                    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/refresh`,
                    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/success`,
                    type: 'account_onboarding',
                })

                console.log("Account link created:", accountLink.url);

                return NextResponse.json({
                    url: accountLink.url,
                })
            }
        }
        
    } catch (error) {
        console.error(
            'An error occurred when calling the stripe API to create an account:',
            error
        )
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
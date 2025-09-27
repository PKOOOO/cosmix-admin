import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-08-27.basil",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
    try {
        const body = await req.text();
        const signature = req.headers.get("stripe-signature")!;

        let event: Stripe.Event;

        try {
            event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        } catch (err) {
            console.error("Webhook signature verification failed:", err);
            return new NextResponse("Webhook signature verification failed", { status: 400 });
        }

        console.log("Stripe webhook event:", event.type);

        switch (event.type) {
            case "payment_intent.succeeded":
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                console.log("Payment succeeded:", paymentIntent.id);

                // Update booking status to confirmed
                if (paymentIntent.metadata.bookingIds) {
                    const bookingIds = paymentIntent.metadata.bookingIds.split(',');
                    
                    for (const bookingId of bookingIds) {
                        await prismadb.booking.update({
                            where: { id: bookingId },
                            data: { 
                                status: 'confirmed',
                                // Note: We don't have paymentStatus field in schema
                            }
                        });
                    }
                    
                    console.log(`Updated ${bookingIds.length} bookings to confirmed status`);
                }
                break;

            case "payment_intent.payment_failed":
                const failedPayment = event.data.object as Stripe.PaymentIntent;
                console.log("Payment failed:", failedPayment.id);

                // Update booking status to cancelled
                if (failedPayment.metadata.bookingIds) {
                    const bookingIds = failedPayment.metadata.bookingIds.split(',');
                    
                    for (const bookingId of bookingIds) {
                        await prismadb.booking.update({
                            where: { id: bookingId },
                            data: { status: 'cancelled' }
                        });
                    }
                    
                    console.log(`Updated ${bookingIds.length} bookings to cancelled status`);
                }
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error("Stripe webhook error:", error);
        return new NextResponse("Webhook error", { status: 500 });
    }
}

export const runtime = "nodejs";

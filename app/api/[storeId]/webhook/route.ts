import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { stripe } from "@/lib/stripe";
import prismadb from "@/lib/prismadb";

export async function POST(
    req: Request,
    { params }: { params: { storeId: string } }
) {
    const body = await req.text();
    const signature = headers().get("Stripe-Signature") as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (error: any) {
        console.log(`Webhook signature verification failed: ${error.message}`);
        return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
    }

    console.log(`Received webhook event: ${event.type}`);

    if (event.type === "payment_intent.succeeded") {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        console.log(`Payment succeeded for PaymentIntent: ${paymentIntent.id}`);
        console.log(`Metadata:`, paymentIntent.metadata);

        try {
            // Get booking IDs from metadata
            const bookingIds = paymentIntent.metadata.bookingIds?.split(',') || [];
            
            if (bookingIds.length === 0) {
                console.log('No booking IDs found in payment intent metadata');
                return new NextResponse('No booking IDs found', { status: 400 });
            }

            // Update all bookings to confirmed status
            const updatedBookings = await prismadb.booking.updateMany({
                where: {
                    id: {
                        in: bookingIds
                    },
                    storeId: params.storeId
                },
                data: {
                    status: 'confirmed'
                }
            });

            console.log(`Updated ${updatedBookings.count} bookings to confirmed status`);

            // You can also send confirmation emails here if needed
            // await sendBookingConfirmationEmail(bookingIds);

        } catch (error) {
            console.error('Error updating bookings:', error);
            return new NextResponse('Error updating bookings', { status: 500 });
        }
    }

    if (event.type === "payment_intent.payment_failed") {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        console.log(`Payment failed for PaymentIntent: ${paymentIntent.id}`);

        try {
            // Get booking IDs from metadata
            const bookingIds = paymentIntent.metadata.bookingIds?.split(',') || [];
            
            if (bookingIds.length > 0) {
                // Update bookings to failed status
                await prismadb.booking.updateMany({
                    where: {
                        id: {
                            in: bookingIds
                        },
                        storeId: params.storeId
                    },
                    data: {
                        status: 'failed'
                    }
                });

                console.log(`Updated ${bookingIds.length} bookings to failed status`);
            }
        } catch (error) {
            console.error('Error updating failed bookings:', error);
        }
    }

    return new NextResponse(null, { status: 200 });
}
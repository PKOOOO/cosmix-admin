import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-12-18.acacia",
});

export async function POST(req: Request) {
    try {
        const { saloonServiceIds, customerInfo } = await req.json();
        
        console.log('Checkout request received:', { saloonServiceIds, customerInfo });
        
        // Resolve authenticated Clerk user if present
        let resolvedClerkUserId: string | null = null;
        try {
            const { userId: clerkUserId } = auth();
            if (clerkUserId) {
                resolvedClerkUserId = clerkUserId;
                console.log('Checkout: resolved Clerk userId from auth():', resolvedClerkUserId);
            }
        } catch (e) {
            console.log('Checkout: auth() failed or not available');
        }

        // For now, we'll create bookings without payment processing
        // In a real implementation, you'd integrate with Stripe here
        
        const bookings = [];
        
        for (const saloonServiceId of saloonServiceIds) {
            const [saloonId, serviceId] = saloonServiceId.split(':');
            
            // Get the saloon service details
            const saloonService = await prismadb.saloonService.findFirst({
                where: {
                    saloonId: saloonId,
                    serviceId: serviceId
                },
                include: {
                    saloon: true,
                    service: true
                }
            });
            
            if (!saloonService) {
                return NextResponse.json(
                    { error: `Service not found: ${saloonServiceId}` },
                    { status: 404 }
                );
            }
            
            // Create or find a user for the booking
            let userId: string | null = null;

            // 1) Prefer authenticated Clerk user
            if (resolvedClerkUserId) {
                let user = await prismadb.user.findUnique({ where: { clerkId: resolvedClerkUserId } });

                // 1a) If not found but we have email, link existing email user to this Clerk account
                if (!user && customerInfo?.email) {
                    const byEmail = await prismadb.user.findFirst({ where: { email: customerInfo.email } });
                    if (byEmail) {
                        user = await prismadb.user.update({
                            where: { id: byEmail.id },
                            data: { clerkId: resolvedClerkUserId }
                        });
                    }
                }

                // 1b) Still not found, create a proper user with clerkId
                if (!user) {
                    user = await prismadb.user.create({
                        data: {
                            clerkId: resolvedClerkUserId,
                            email: customerInfo?.email ?? `unknown+${Date.now()}@example.com`,
                            name: customerInfo?.name ?? 'Unknown',
                        }
                    });
                }
                userId = user.id;
            }

            // 2) If no Clerk auth, fall back to customer payload
            if (!userId) {
                // Try to find existing user by email first
                const existingByEmail = customerInfo?.email
                    ? await prismadb.user.findFirst({ where: { email: customerInfo.email } })
                    : null;

                if (existingByEmail) {
                    userId = existingByEmail.id;
                } else {
                    // Create a temporary user for anonymous bookings
                    const tempUser = await prismadb.user.create({
                        data: {
                            clerkId: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            email: customerInfo?.email ?? `unknown+${Date.now()}@example.com`,
                            name: customerInfo?.name ?? 'Unknown',
                        }
                    });
                    userId = tempUser.id;
                }
            }
            
            // Create booking
            const booking = await prismadb.booking.create({
                data: {
                    userId: userId!,
                    saloonId: saloonId,
                    serviceId: serviceId,
                    bookingTime: customerInfo.bookingTime,
                    status: 'pending',
                    totalAmount: saloonService.price,
                    notes: customerInfo.notes || '',
                    customerName: customerInfo.name,
                    customerPhone: customerInfo.phone,
                    customerEmail: customerInfo.email,
                }
            });
            
            bookings.push(booking);
        }
        
        // Create Stripe Payment Intent
        const totalAmount = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
        
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(totalAmount * 100), // Convert to cents
            currency: 'usd',
            metadata: {
                bookingIds: bookings.map(b => b.id).join(','),
                customerEmail: customerInfo.email,
                customerName: customerInfo.name,
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });
        
        const response = {
            clientSecret: paymentIntent.client_secret,
            sessionId: paymentIntent.id,
            bookingIds: bookings.map(b => b.id),
            amount: totalAmount
        };
        
        console.log('Checkout completed with Stripe Payment Intent:', response);
        
        return NextResponse.json(response);
        
    } catch (error) {
        console.error('[CHECKOUT_POST]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";

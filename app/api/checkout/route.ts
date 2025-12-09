import Stripe from "stripe";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import prismadb from "@/lib/prismadb";
import { auth } from "@clerk/nextjs/server";
import { sendBookingConfirmationToUser, sendBookingNotificationToSalon } from "@/lib/email";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

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

        // Calculate total amount and validate services
        let totalAmount = 0;
        const servicesData: Array<{
            saloonService: any;
            saloonId: string;
            serviceId: string;
        }> = [];
        
        for (const saloonServiceId of saloonServiceIds) {
            const [saloonId, serviceId] = saloonServiceId.split(':');
            
            // Get the saloon service details
            const saloonService = await prismadb.saloonService.findFirst({
                where: {
                    saloonId: saloonId,
                    serviceId: serviceId
                },
                include: {
                    saloon: {
                        include: {
                            user: true // Include salon owner for email
                        }
                    },
                    service: true
                }
            });
            
            if (!saloonService) {
                return NextResponse.json(
                    { error: `Service not found: ${saloonServiceId}` },
                    { status: 404, headers: corsHeaders }
                );
            }
            
            totalAmount += saloonService.price;
            servicesData.push({ saloonService, saloonId, serviceId });
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

        // Create bookings first (with pending status)
        const bookings = [];
        const emailPromises = [];
        
        for (const { saloonService, saloonId, serviceId } of servicesData) {
            // Create booking with pending status (will be confirmed after payment)
            const booking = await prismadb.booking.create({
                data: {
                    userId: userId!,
                    saloonId: saloonId,
                    serviceId: serviceId,
                    bookingTime: new Date(customerInfo.bookingTime),
                    status: 'pending', // Pending until payment is confirmed
                    paymentMethod: 'online',
                    totalAmount: saloonService.price,
                    notes: customerInfo.notes || '',
                    customerName: customerInfo.name,
                    customerPhone: customerInfo.phone,
                    customerEmail: customerInfo.email,
                }
            });
            
            bookings.push(booking);
        }

        // Create Stripe PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(totalAmount * 100), // Convert to cents
            currency: 'eur',
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                bookingIds: bookings.map(b => b.id).join(','),
                customerEmail: customerInfo.email,
                customerName: customerInfo.name,
            },
        });

        console.log('PaymentIntent created:', paymentIntent.id);

        // Return the client secret and booking info
        const response = {
            success: true,
            paymentIntentClientSecret: paymentIntent.client_secret,
            publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
            bookingIds: bookings.map(b => b.id),
            amount: totalAmount,
            paymentMethod: 'online',
            status: 'pending'
        };
        
        console.log('Checkout response:', { ...response, paymentIntentClientSecret: '***hidden***' });
        
        return NextResponse.json(response, { headers: corsHeaders });
        
    } catch (error) {
        console.error('[CHECKOUT_POST]', error);
        return new NextResponse("Internal error", { status: 500, headers: corsHeaders });
    }
}

// Endpoint to confirm booking after payment success (called from mobile app)
export async function PATCH(req: Request) {
    try {
        const { bookingIds, paymentIntentId } = await req.json();
        
        console.log('Confirming bookings:', { bookingIds, paymentIntentId });
        
        if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
            return NextResponse.json(
                { error: "Missing booking IDs" },
                { status: 400, headers: corsHeaders }
            );
        }

        const emailPromises = [];

        // Update all bookings to confirmed status
        for (const bookingId of bookingIds) {
            const booking = await prismadb.booking.update({
                where: { id: bookingId },
                data: { status: 'confirmed' },
                include: {
                    saloon: {
                        include: {
                            user: true
                        }
                    },
                    service: true
                }
            });

            // Prepare email data
            const bookingDate = new Date(booking.bookingTime).toLocaleDateString('fi-FI', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            const bookingTime = new Date(booking.bookingTime).toLocaleTimeString('fi-FI', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            // Send confirmation email to customer
            if (booking.customerEmail) {
                const userEmailPromise = sendBookingConfirmationToUser({
                    customerName: booking.customerName || 'Customer',
                    customerEmail: booking.customerEmail,
                    saloonName: booking.saloon.name,
                    serviceName: booking.service.name,
                    bookingTime: bookingTime,
                    bookingDate: bookingDate,
                    totalAmount: booking.totalAmount || 0,
                    notes: booking.notes || undefined
                });
                emailPromises.push(userEmailPromise);
            }
            
            // Send notification email to salon owner
            if (booking.saloon.user.email) {
                const salonEmailPromise = sendBookingNotificationToSalon({
                    customerName: booking.customerName || 'Customer',
                    customerEmail: booking.customerEmail || '',
                    customerPhone: booking.customerPhone || '',
                    saloonName: booking.saloon.name,
                    serviceName: booking.service.name,
                    bookingTime: bookingTime,
                    bookingDate: bookingDate,
                    totalAmount: booking.totalAmount || 0,
                    notes: booking.notes || undefined,
                    salonEmail: booking.saloon.user.email
                });
                emailPromises.push(salonEmailPromise);
            }
        }
        
        // Send all emails in parallel
        try {
            await Promise.all(emailPromises);
            console.log('All confirmation emails sent successfully');
        } catch (emailError) {
            console.error('Error sending confirmation emails:', emailError);
            // Don't fail the confirmation if email fails
        }

        return NextResponse.json({
            success: true,
            message: 'Booking confirmed! You will receive a confirmation email shortly.',
            bookingIds,
            status: 'confirmed'
        }, { headers: corsHeaders });

    } catch (error) {
        console.error('[CHECKOUT_PATCH]', error);
        return new NextResponse("Internal error", { status: 500, headers: corsHeaders });
    }
}

export const runtime = "nodejs";

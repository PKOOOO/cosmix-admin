import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { auth } from "@clerk/nextjs/server";
import { paytrail, PAYTRAIL_CURRENCY } from "@/lib/paytrail";

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

        // Create bookings and process payments with Paytrail
        
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
        
        // Create Paytrail Payment
        const totalAmount = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
        
        // Create Paytrail payment request
        const paymentRequest = {
            stamp: `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            reference: `REF_${bookings.map(b => b.id).join('_')}`,
            amount: Math.round(totalAmount * 100), // Convert to cents
            currency: PAYTRAIL_CURRENCY,
            language: 'FI',
            items: bookings.map(booking => ({
                unitPrice: Math.round((booking.totalAmount || 0) * 100),
                units: 1,
                vatPercentage: 24, // Finland VAT
                productCode: `service_${booking.serviceId}`,
                description: `Service booking for ${booking.customerName}`,
            })),
            customer: {
                email: customerInfo.email,
                firstName: customerInfo.name?.split(' ')[0] || 'Customer',
                lastName: customerInfo.name?.split(' ').slice(1).join(' ') || '',
                phone: customerInfo.phone || '',
            },
            redirectUrls: {
                success: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
                cancel: `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel`,
            },
            callbackUrls: {
                success: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/paytrail/success`,
                cancel: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/paytrail/cancel`,
            },
            metadata: {
                bookingIds: bookings.map(b => b.id).join(','),
                customerEmail: customerInfo.email,
                customerName: customerInfo.name,
            },
        };
        
        const payment = await paytrail.createPayment(paymentRequest);
        
        const response = {
            paymentUrl: (payment as any).href,
            transactionId: (payment as any).transactionId,
            bookingIds: bookings.map(b => b.id),
            amount: totalAmount
        };
        
        console.log('Checkout completed with Paytrail Payment:', response);
        
        return NextResponse.json(response);
        
    } catch (error) {
        console.error('[CHECKOUT_POST]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";

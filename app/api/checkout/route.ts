import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { auth } from "@clerk/nextjs/server";
import { sendBookingConfirmationToUser, sendBookingNotificationToSalon } from "@/lib/email";

export async function POST(req: Request) {
    try {
        const { saloonServiceIds, customerInfo } = await req.json();
        
        console.log('Checkout request received (Pay at Venue):', { saloonServiceIds, customerInfo });
        
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

        // Create bookings without payment processing
        
        const bookings = [];
        const emailPromises = [];
        
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
            
            // Create booking with confirmed status and pay_at_venue method
            const booking = await prismadb.booking.create({
                data: {
                    userId: userId!,
                    saloonId: saloonId,
                    serviceId: serviceId,
                    bookingTime: customerInfo.bookingTime,
                    status: 'confirmed', // Directly confirmed since no payment needed
                    paymentMethod: 'pay_at_venue',
                    totalAmount: saloonService.price,
                    notes: customerInfo.notes || '',
                    customerName: customerInfo.name,
                    customerPhone: customerInfo.phone,
                    customerEmail: customerInfo.email,
                }
            });
            
            bookings.push(booking);
            
            // Prepare email data
            const bookingDate = new Date(customerInfo.bookingTime).toLocaleDateString('fi-FI', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            const bookingTime = new Date(customerInfo.bookingTime).toLocaleTimeString('fi-FI', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            // Send confirmation email to customer
            if (customerInfo.email) {
                const userEmailPromise = sendBookingConfirmationToUser({
                    customerName: customerInfo.name,
                    customerEmail: customerInfo.email,
                    saloonName: saloonService.saloon.name,
                    serviceName: saloonService.service.name,
                    bookingTime: bookingTime,
                    bookingDate: bookingDate,
                    totalAmount: saloonService.price,
                    notes: customerInfo.notes
                });
                emailPromises.push(userEmailPromise);
            }
            
            // Send notification email to salon owner
            if (saloonService.saloon.user.email) {
                const salonEmailPromise = sendBookingNotificationToSalon({
                    customerName: customerInfo.name,
                    customerEmail: customerInfo.email,
                    customerPhone: customerInfo.phone,
                    saloonName: saloonService.saloon.name,
                    serviceName: saloonService.service.name,
                    bookingTime: bookingTime,
                    bookingDate: bookingDate,
                    totalAmount: saloonService.price,
                    notes: customerInfo.notes,
                    salonEmail: saloonService.saloon.user.email
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
            // Don't fail the booking if email fails
        }
        
        const totalAmount = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
        
        const response = {
            success: true,
            message: 'Booking confirmed! You will receive a confirmation email shortly.',
            bookingIds: bookings.map(b => b.id),
            amount: totalAmount,
            paymentMethod: 'pay_at_venue',
            status: 'confirmed'
        };
        
        console.log('Checkout completed (Pay at Venue):', response);
        
        return NextResponse.json(response);
        
    } catch (error) {
        console.error('[CHECKOUT_POST]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";

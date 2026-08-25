import Stripe from "stripe";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { sendBookingConfirmationToUser, sendBookingNotificationToSalon } from "@/lib/email";
import { sendPushNotification } from "@/lib/send-notification";
import { getEndUser } from "@/lib/admin-access";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Initialize Stripe lazily to check for missing env vars
const getStripe = () => {
    if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    return new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2025-11-17.clover",
        typescript: true,
    });
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
    try {
        // Check for required environment variables
        if (!process.env.STRIPE_SECRET_KEY) {
            console.error('[CHECKOUT_POST] Missing STRIPE_SECRET_KEY');
            return NextResponse.json(
                { error: "Payment system not configured" },
                { status: 500, headers: corsHeaders }
            );
        }

        const { saloonServiceIds, customerInfo } = await req.json();
        
        // NB: customerInfo carries PII (name, email, phone) — never log it.
        console.log('Checkout request received:', {
            saloonServiceIds,
            serviceCount: Array.isArray(saloonServiceIds) ? saloonServiceIds.length : 0,
            bookingTime: customerInfo?.bookingTime,
            hasEmail: !!customerInfo?.email,
            hasPhone: !!customerInfo?.phone,
        });
        

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

        // Resolve the acting user from the verified Clerk token (X-User-Token).
        // getEndUser() never returns the synthetic service identity — attaching
        // bookings to that shared row is what corrupted ownership previously.
        // Anonymous checkout is a supported flow, so a missing, unverifiable or
        // service-only credential degrades to the customer-payload path rather
        // than blocking a paid booking.
        let userId: string;

        const endUser = await getEndUser();

        if (endUser) {
            // Verified signed-in customer — attach to their real row.
            userId = endUser.id;
        } else {
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
                    userId: userId,
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
        // Funds are credited to the platform Stripe account; providers are paid out
        // manually via SEPA bank transfer (see /api/provider/revenue for the 10% fee math).
        const stripe = getStripe();

        // bookingIds metadata is kept for reconciliation in the Stripe dashboard
        // only — PATCH no longer verifies against it, so the 500-char metadata
        // cap can no longer cause a false rejection. Ownership is established by
        // Booking.paymentIntentId, stamped below.
        const bookingIdsCsv = bookings.map(b => b.id).join(',');

        const intentParams: Stripe.PaymentIntentCreateParams = {
            amount: Math.round(totalAmount * 100),
            currency: 'eur',
            automatic_payment_methods: { enabled: true },
            metadata: {
                // Truncated for very large orders; informational only.
                bookingIds: bookingIdsCsv.slice(0, 500),
                bookingIdCount: String(bookings.length),
                customerEmail: customerInfo.email,
                customerName: customerInfo.name,
            },
        };

        const paymentIntent = await stripe.paymentIntents.create(intentParams);

        // Bind each booking to the PaymentIntent that pays for it. This is the
        // authoritative ownership link PATCH checks, and unlike Stripe metadata
        // it has no length ceiling.
        await prismadb.booking.updateMany({
            where: { id: { in: bookings.map(b => b.id) } },
            data: { paymentIntentId: paymentIntent.id },
        });

        console.log('PaymentIntent created:', paymentIntent.id);

        // Return the client secret and booking info
        const response = {
            success: true,
            paymentIntentClientSecret: paymentIntent.client_secret,
            publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISH_KEY,
            bookingIds: bookings.map(b => b.id),
            amount: totalAmount,
            paymentMethod: 'online',
            status: 'pending'
        };
        
        console.log('Checkout response:', { ...response, paymentIntentClientSecret: '***hidden***' });
        
        return NextResponse.json(response, { headers: corsHeaders });
        
    } catch (error) {
        console.error('[CHECKOUT_POST] Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[CHECKOUT_POST] Error message:', errorMessage);
        return NextResponse.json(
            { error: errorMessage },
            { status: 500, headers: corsHeaders }
        );
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

        // STEP 1: a confirmation is only meaningful alongside its payment.
        if (!paymentIntentId || typeof paymentIntentId !== 'string') {
            return NextResponse.json(
                { error: "Missing paymentIntentId" },
                { status: 400, headers: corsHeaders }
            );
        }

        // STEP 2: load the bookings up front. Previously a bad id threw a raw
        // Prisma error out of the loop and surfaced as a 500.
        const existingBookings = await prismadb.booking.findMany({
            where: { id: { in: bookingIds } },
            select: { id: true, status: true, userId: true, paymentIntentId: true },
        });

        if (existingBookings.length !== bookingIds.length) {
            return NextResponse.json(
                { error: "One or more bookings not found" },
                { status: 404, headers: corsHeaders }
            );
        }

        // STEPS 3 & 4: verify the payment with Stripe, and that these bookings
        // belong to it.
        //
        // This runs AFTER the customer's card has been charged, so the failure
        // policy is asymmetric on purpose:
        //   - Stripe answers, and the answer is "not paid" or "not yours" → reject.
        //   - Stripe cannot be reached (network / 5xx / timeout) → allow, and log
        //     loudly. A paid customer must never be stranded by an API blip.
        // A definitive 4xx (e.g. "no such payment_intent") is an ANSWER, not a
        // blip — failing open there would let any forged id bypass the check.
        try {
            const stripe = getStripe();
            const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

            // 'processing' is included deliberately: automatic_payment_methods
            // allows non-card methods that settle asynchronously and sit in
            // 'processing' at this point in the flow.
            const PAID_STATUSES = ['succeeded', 'processing'];
            if (!PAID_STATUSES.includes(intent.status)) {
                console.warn('[CHECKOUT_PATCH] PaymentIntent not paid:', {
                    paymentIntentId,
                    status: intent.status,
                });
                return NextResponse.json(
                    { error: "Payment not completed" },
                    { status: 402, headers: corsHeaders }
                );
            }

            // Ownership: every booking must be bound to THIS PaymentIntent.
            // Matching on the column rather than Stripe metadata means there is
            // no length ceiling and no order size that can slip the check.
            const foreign = existingBookings.filter(
                b => b.paymentIntentId !== null && b.paymentIntentId !== paymentIntentId
            );
            if (foreign.length > 0) {
                console.warn('[CHECKOUT_PATCH] Bookings belong to a different payment:', {
                    paymentIntentId,
                    bookingIds: foreign.map(b => b.id),
                });
                return NextResponse.json(
                    { error: "Bookings do not belong to this payment" },
                    { status: 403, headers: corsHeaders }
                );
            }

            // Rows predating this column carry null. Fall back to the metadata
            // subset check for them, and if that is unavailable too, allow with
            // a warning — a legacy customer must not be stranded post-charge.
            const legacy = existingBookings.filter(b => b.paymentIntentId === null);
            if (legacy.length > 0) {
                const csv = intent.metadata?.bookingIds;
                if (csv) {
                    const paidIds = new Set(csv.split(',').filter(Boolean));
                    const unmatched = legacy.filter(b => !paidIds.has(b.id));
                    if (unmatched.length > 0) {
                        console.warn('[CHECKOUT_PATCH] Legacy bookings not covered by this payment:', {
                            paymentIntentId,
                            bookingIds: unmatched.map(b => b.id),
                        });
                        return NextResponse.json(
                            { error: "Bookings do not belong to this payment" },
                            { status: 403, headers: corsHeaders }
                        );
                    }
                } else {
                    console.warn('[CHECKOUT_PATCH] Legacy bookings with no metadata to verify against; allowing', {
                        paymentIntentId,
                        bookingIds: legacy.map(b => b.id),
                    });
                }
            }
        } catch (stripeError: any) {
            const statusCode = stripeError?.statusCode;
            const isDefinitiveRejection =
                stripeError?.type === 'StripeInvalidRequestError' ||
                (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500);

            if (isDefinitiveRejection) {
                console.error('[CHECKOUT_PATCH] Stripe rejected paymentIntentId:', {
                    paymentIntentId,
                    message: stripeError?.message,
                });
                return NextResponse.json(
                    { error: "Payment could not be verified" },
                    { status: 402, headers: corsHeaders }
                );
            }

            console.error('[CHECKOUT_PATCH] Stripe unreachable — allowing confirmation (fail-open):', {
                paymentIntentId,
                message: stripeError?.message,
            });
        }

        // STEP 5: identity cross-check, logged but NOT enforced. Step 4 already
        // establishes ownership, and legitimate mismatches exist (customer signs
        // in between POST and PATCH, or POST went out anonymously), which would
        // strand a paid customer if enforced.
        const endUser = await getEndUser();
        if (endUser) {
            const mismatched = existingBookings.filter(b => b.userId !== endUser.id);
            if (mismatched.length > 0) {
                console.warn('[CHECKOUT_PATCH] Identity mismatch (not enforced):', {
                    callerUserId: endUser.id,
                    bookingIds: mismatched.map(b => b.id),
                });
            }
        }

        // STEP 6: only pending bookings transition. Retries are expected on this
        // path (the customer has already paid), so re-confirming must not
        // re-send emails or pushes.
        const pendingIds = existingBookings
            .filter(b => b.status === 'pending')
            .map(b => b.id);
        const alreadyConfirmed = existingBookings
            .filter(b => b.status !== 'pending')
            .map(b => b.id);

        if (alreadyConfirmed.length > 0) {
            console.log('[CHECKOUT_PATCH] Skipping already-confirmed bookings:', alreadyConfirmed);
        }

        const confirmedIds: string[] = [];
        const emailPromises = [];
        // Collected after each booking is confirmed; sent (best-effort) once the
        // booking success path is already determined so notifications never affect it.
        const pushNotifications: Array<{
            customerToken: string | null;
            providerToken: string | null;
            serviceName: string;
            saloonName: string;
            customerName: string;
            whenLabel: string;
        }> = [];

        // Update pending bookings to confirmed status
        for (const bookingId of pendingIds) {
            // Guarded update: whoever flips pending -> confirmed owns sending the
            // notifications. A concurrent retry gets count 0 and sends nothing.
            const { count } = await prismadb.booking.updateMany({
                where: { id: bookingId, status: 'pending' },
                data: { status: 'confirmed' },
            });

            if (count === 0) {
                console.log('[CHECKOUT_PATCH] Booking already confirmed concurrently, skipping:', bookingId);
                continue;
            }

            const booking = await prismadb.booking.findUnique({
                where: { id: bookingId },
                include: {
                    user: true, // customer — for their pushToken
                    saloon: {
                        include: {
                            user: true
                        }
                    },
                    service: true
                }
            });

            if (!booking) continue;

            confirmedIds.push(booking.id);

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

            // Compact, human-readable label for push bodies, e.g. "Mon 2 Jun at 14:00"
            const whenLabel = `${new Date(booking.bookingTime).toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short'
            })} at ${new Date(booking.bookingTime).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            })}`;

            pushNotifications.push({
                customerToken: booking.user?.pushToken ?? null,
                providerToken: booking.saloon.user?.pushToken ?? null,
                serviceName: booking.service.name,
                saloonName: booking.saloon.name,
                customerName: booking.customerName || 'A customer',
                whenLabel,
            });
        }

        // Send all emails in parallel
        try {
            await Promise.all(emailPromises);
            console.log('All confirmation emails sent successfully');
        } catch (emailError) {
            console.error('Error sending confirmation emails:', emailError);
            // Don't fail the confirmation if email fails
        }

        // Best-effort push notifications. The booking is already confirmed at this point,
        // so any failure here must never affect the response. sendPushNotification also
        // swallows its own errors, but we wrap defensively per the notification contract.
        try {
            const pushPromises: Promise<void>[] = [];
            for (const n of pushNotifications) {
                // C1 → Customer
                if (n.customerToken) {
                    pushPromises.push(sendPushNotification(
                        n.customerToken,
                        "Booking Confirmed ✓",
                        `${n.serviceName} at ${n.saloonName} on ${n.whenLabel}`,
                        { type: "booking_confirmed" }
                    ));
                }
                // P7 → Provider
                if (n.providerToken) {
                    pushPromises.push(sendPushNotification(
                        n.providerToken,
                        "New Booking 🎉",
                        `${n.customerName} booked ${n.serviceName} on ${n.whenLabel}`,
                        { type: "new_booking" }
                    ));
                }
            }
            await Promise.all(pushPromises);
        } catch (pushError) {
            console.error('Error sending push notifications:', pushError);
            // Never fail the confirmation if push fails
        }

        return NextResponse.json({
            success: true,
            message: 'Booking confirmed! You will receive a confirmation email shortly.',
            bookingIds,
            // Which ids this call actually transitioned vs. which were already
            // confirmed by an earlier attempt. A retry returns 200 with an empty
            // `confirmed` list rather than re-notifying.
            confirmed: confirmedIds,
            alreadyConfirmed,
            status: 'confirmed'
        }, { headers: corsHeaders });

    } catch (error) {
        console.error('[CHECKOUT_PATCH] Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { error: errorMessage },
            { status: 500, headers: corsHeaders }
        );
    }
}

export const runtime = "nodejs";

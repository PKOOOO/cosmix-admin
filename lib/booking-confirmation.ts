import prismadb from "@/lib/prismadb";
import { sendBookingConfirmationToUser, sendBookingNotificationToSalon } from "@/lib/email";
import { formatWhen, notifyUser, SALON_TIME_ZONE } from "@/lib/send-notification";

/**
 * Confirms paid bookings: pending → confirmed, then the confirmation emails
 * and C1 / P7 pushes. Shared by the app's PATCH /api/checkout and the Stripe
 * webhook (payment_intent.succeeded), which can both arrive for the same
 * payment: only the call that actually flips a booking from pending sends its
 * notifications, so a booking is never announced twice.
 */
export async function confirmPendingBookings(existingBookings: { id: string; status: string }[]) {
    // Only pending bookings transition. Retries are expected on this
    // path (the customer has already paid), so re-confirming must not
    // re-send emails or pushes.
    const pendingIds = existingBookings
        .filter(b => b.status === 'pending')
        .map(b => b.id);
    const alreadyConfirmed = existingBookings
        .filter(b => b.status !== 'pending')
        .map(b => b.id);

    if (alreadyConfirmed.length > 0) {
        console.log('[CONFIRM_BOOKINGS] Skipping already-confirmed bookings:', alreadyConfirmed);
    }

    const confirmedIds: string[] = [];
    const emailPromises = [];
    // Collected after each booking is confirmed; sent (best-effort) once the
    // booking success path is already determined so notifications never affect it.
    const pushNotifications: Array<{
        customerId: string;
        providerId: string;
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
            console.log('[CONFIRM_BOOKINGS] Booking already confirmed concurrently, skipping:', bookingId);
            continue;
        }

        const booking = await prismadb.booking.findUnique({
            where: { id: bookingId },
            include: {
                user: true, // customer
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
        // In the salon's time zone (the server runs in UTC), e.g.
        // "maanantai 9. marraskuuta" and "14:00".
        const bookingDate = new Date(booking.bookingTime).toLocaleDateString('fi-FI', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            timeZone: SALON_TIME_ZONE,
        });

        const bookingTime = new Date(booking.bookingTime).toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: SALON_TIME_ZONE,
        });
        
        // Send confirmation email to customer
        if (booking.customerEmail) {
            const userEmailPromise = sendBookingConfirmationToUser({
                customerName: booking.customerName || 'Customer',
                customerEmail: booking.customerEmail,
                saloonName: booking.saloon.name,
                saloonAddress: booking.saloon.address,
                saloonPhone: booking.saloon.phone,
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
        const whenLabel = formatWhen(booking.bookingTime);

        pushNotifications.push({
            // Ids, not tokens: notifyUser sends to every device of each
            // user and skips the service user (guest checkouts).
            customerId: booking.userId,
            providerId: booking.saloon.userId,
            serviceName: booking.service.name,
            saloonName: booking.saloon.name,
            customerName: booking.customerName || 'A customer',
            whenLabel,
        });
    }

    // Best-effort push notifications, sent right away — they used to wait
    // for the emails, which can take much longer (or time out). The booking is already confirmed at this point,
    // so any failure here must never affect the response. notifyUser also
    // swallows its own errors, but we wrap defensively per the notification contract.
    try {
        const pushPromises: Promise<void>[] = [];
        for (const n of pushNotifications) {
            // C1 → Customer
            pushPromises.push(notifyUser(
                n.customerId,
                "Booking Confirmed ✓",
                `${n.serviceName} at ${n.saloonName} on ${n.whenLabel}`,
                { type: "booking_confirmed" }
            ));
            // P7 → Provider
            pushPromises.push(notifyUser(
                n.providerId,
                "New Booking 🎉",
                `${n.customerName} booked ${n.serviceName} on ${n.whenLabel}`,
                { type: "new_booking" }
            ));
        }
        await Promise.all(pushPromises);
    } catch (pushError) {
        console.error('Error sending push notifications:', pushError);
        // Never fail the confirmation if push fails
    }

    // Emails were started above and finish in the background: the API runs
    // as a long-lived server on Railway, so neither the app's checkout call
    // nor Stripe's webhook waits for the mail server.
    Promise.all(emailPromises)
        .then(() => console.log('All confirmation emails sent successfully'))
        .catch((emailError) => console.error('Error sending confirmation emails:', emailError));

    return { confirmedIds, alreadyConfirmed };
}

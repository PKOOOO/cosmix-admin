import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { getEndUser } from "@/lib/admin-access";
import { formatWhen, notifyUser } from "@/lib/send-notification";
import { refundBooking, RefundError } from "@/lib/refunds";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Token",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

const fail = (error: string, status: number) =>
  NextResponse.json({ error }, { status, headers: corsHeaders });

// PUT /api/provider/bookings/[bookingId]  { status, reason? }
//
// What a salon can do with its own booking:
// - cancelled: before it has been paid out. An online payment is refunded
//   through Stripe first; if the refund fails, the booking stays as it was.
// - completed / no_show: once the start time has passed.
// - confirmed: undo completed / no_show (before payout). Sent for an already
//   confirmed booking it is a no-op (older APKs had a "Confirm" button).
export async function PUT(
  req: Request,
  { params }: { params: { bookingId: string } }
) {
  try {
    const user = await getEndUser();
    if (!user) return fail("Unauthorized", 401);

    const { status, reason } = await req.json();
    if (!["confirmed", "cancelled", "completed", "no_show"].includes(status)) {
      return fail("Invalid status", 400);
    }
    const cancelReason = typeof reason === "string" && reason.trim() ? reason.trim().slice(0, 300) : null;

    const saloon = await prismadb.saloon.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!saloon) return fail("No saloon found", 404);

    const booking = await prismadb.booking.findUnique({
      where: { id: params.bookingId },
      select: {
        id: true,
        saloonId: true,
        status: true,
        userId: true,
        bookingTime: true,
        paymentMethod: true,
        paymentIntentId: true,
        totalAmount: true,
        refundId: true,
        payoutId: true,
        service: { select: { name: true } },
        saloon: { select: { name: true } },
      },
    });
    if (!booking || booking.saloonId !== saloon.id) return fail("Booking not found", 404);

    if (booking.status === status) {
      return NextResponse.json({ id: booking.id, status: booking.status }, { headers: corsHeaders });
    }
    if (booking.payoutId) {
      return fail("This booking is already included in a payout. Contact Kosmiks support to change it.", 409);
    }

    const started = booking.bookingTime <= new Date();
    if (status === "cancelled" && !["confirmed", "pending"].includes(booking.status)) {
      return fail("Only upcoming bookings can be cancelled.", 409);
    }
    if ((status === "completed" || status === "no_show") && (booking.status !== "confirmed" || !started)) {
      return fail("You can mark a booking once its start time has passed.", 409);
    }
    if (status === "confirmed" && !["completed", "no_show"].includes(booking.status)) {
      return fail("Invalid status change", 409);
    }

    let refundId: string | null = null;
    if (status === "cancelled") {
      try {
        refundId = await refundBooking(booking);
      } catch (error) {
        console.error("[PROVIDER_BOOKING_REFUND]", booking.id, error instanceof Error ? error.message : error);
        return fail(
          error instanceof RefundError && error.code === "no_payment_reference"
            ? "This booking can't be refunded automatically. Contact Kosmiks support to cancel it."
            : "The refund didn't go through, so the booking was not cancelled. Please try again.",
          502
        );
      }
    }

    // Only change the booking if nobody else changed it in the meantime.
    const { count } = await prismadb.booking.updateMany({
      where: { id: booking.id, status: booking.status, payoutId: null },
      data: {
        status,
        ...(status === "cancelled" && { cancelReason, refundId }),
      },
    });
    if (count === 0) return fail("This booking was just changed. Refresh and try again.", 409);

    // C2: tell the customer when the salon cancels.
    if (status === "cancelled") {
      const when = formatWhen(booking.bookingTime);
      const what = `${booking.saloon.name} cancelled your ${booking.service?.name ?? "booking"} on ${when}.`;
      await notifyUser(
        booking.userId,
        "Booking cancelled",
        [what, cancelReason ? `Reason: ${cancelReason}` : null, refundId ? "Your payment will be refunded to your card." : null]
          .filter(Boolean)
          .join(" "),
        { type: "customer_booking_cancelled", bookingId: booking.id }
      );
    }

    return NextResponse.json({ id: booking.id, status, refunded: !!refundId }, { headers: corsHeaders });
  } catch (error) {
    console.error("[PROVIDER_BOOKING_PUT]", error);
    return fail("Internal server error", 500);
  }
}

export const runtime = "nodejs";

import Stripe from "stripe";
import { stripe } from "@/lib/stripe";

export class RefundError extends Error {
  constructor(public code: "no_payment_reference" | "stripe", message: string) {
    super(message);
    this.name = "RefundError";
  }
}

type RefundableBooking = {
  id: string;
  status: string;
  paymentMethod: string;
  paymentIntentId: string | null;
  totalAmount: number | null;
  refundId: string | null;
};

/**
 * Refunds a cancelled booking's online payment, before its status changes.
 * Returns the Stripe refund id, or null when there is nothing to refund
 * (unpaid `pending` booking, pay at the salon, zero price).
 *
 * One PaymentIntent can pay for several bookings, so only this booking's
 * amount is refunded. The idempotency key makes retries (double taps, a
 * failed status update afterwards) return the same refund, never a second.
 */
export async function refundBooking(booking: RefundableBooking): Promise<string | null> {
  if (booking.refundId) return booking.refundId;
  if (booking.paymentMethod !== "online" || booking.status !== "confirmed") return null;

  const amount = Math.round((booking.totalAmount ?? 0) * 100);
  if (amount <= 0) return null;
  if (!booking.paymentIntentId) {
    throw new RefundError("no_payment_reference", "This booking has no payment reference to refund");
  }

  try {
    const refund = await stripe.refunds.create(
      {
        payment_intent: booking.paymentIntentId,
        amount,
        metadata: { bookingId: booking.id },
      },
      { idempotencyKey: `booking-cancel-${booking.id}` }
    );
    return refund.id;
  } catch (error) {
    const message = error instanceof Stripe.errors.StripeError ? error.message : String(error);
    throw new RefundError("stripe", message);
  }
}

import Stripe from "stripe";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { stripe } from "@/lib/stripe";
import { confirmPendingBookings } from "@/lib/booking-confirmation";

// POST /api/webhooks/stripe - events from Stripe, verified with the endpoint's
// signing secret. Two endpoints share this route: the platform endpoint
// (STRIPE_WEBHOOK_SECRET) and the Connect endpoint for connected-account
// events (STRIPE_CONNECT_WEBHOOK_SECRET). Every handler is idempotent:
// Stripe retries and may deliver an event more than once.

function verify(payload: string, signature: string): Stripe.Event | null {
  const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET].filter(Boolean) as string[];
  for (const secret of secrets) {
    try {
      return stripe.webhooks.constructEvent(payload, signature, secret);
    } catch {
      // try the next secret
    }
  }
  return null;
}

const bookingsFor = (paymentIntentId: string) =>
  prismadb.booking.findMany({ where: { paymentIntentId }, select: { id: true, status: true } });

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const payload = await req.text();
  const event = signature ? verify(payload, signature) : null;
  if (!event) return NextResponse.json({ error: "Invalid signature" }, { status: 400 });

  try {
    switch (event.type) {
      // The customer paid. Normally the app confirms the booking right away
      // (PATCH /api/checkout); this covers an app that was closed or offline.
      case "payment_intent.succeeded":
      case "payment_intent.processing": {
        const intent = event.data.object as Stripe.PaymentIntent;
        const bookings = await bookingsFor(intent.id);
        if (bookings.length > 0) {
          const { confirmedIds } = await confirmPendingBookings(bookings);
          if (confirmedIds.length > 0) console.log("[STRIPE_WEBHOOK] confirmed", confirmedIds.length, "booking(s) for", intent.id);
        }
        break;
      }

      // The payment was abandoned and cancelled: free the time slot.
      case "payment_intent.canceled": {
        const intent = event.data.object as Stripe.PaymentIntent;
        await prismadb.booking.updateMany({
          where: { paymentIntentId: intent.id, status: "pending" },
          data: { status: "cancelled", cancelReason: "Payment cancelled" },
        });
        break;
      }

      // A refund made outside the app (Stripe dashboard). Refunds the app
      // makes itself carry metadata.bookingId and already cancelled their
      // booking, so they're skipped. A full refund cancels the payment's
      // bookings; partial refunds are left to an admin.
      case "refund.created": {
        const refund = event.data.object as Stripe.Refund;
        if (refund.metadata?.bookingId) break;
        const intentId = typeof refund.payment_intent === "string" ? refund.payment_intent : refund.payment_intent?.id;
        if (!intentId) break;
        const intent = await stripe.paymentIntents.retrieve(intentId, { expand: ["latest_charge"] });
        const charge = intent.latest_charge as Stripe.Charge | null;
        if (!charge || charge.amount_refunded < charge.amount) break;
        await prismadb.booking.updateMany({
          where: { paymentIntentId: intentId, status: { not: "cancelled" }, refundId: null, payoutId: null },
          data: { status: "cancelled", refundId: refund.id, cancelReason: "Refunded in Stripe" },
        });
        break;
      }

      // A provider's Stripe account changed (onboarding finished, requirements).
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        await prismadb.user.updateMany({
          where: { stripeAccountId: account.id },
          data: {
            stripeDetailsSubmitted: !!account.details_submitted,
            stripePayoutsEnabled: account.capabilities?.transfers === "active",
          },
        });
        break;
      }

      default:
        break;
    }
  } catch (error) {
    // 500 makes Stripe retry later.
    console.error("[STRIPE_WEBHOOK]", event.type, event.id, error);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

export const runtime = "nodejs";

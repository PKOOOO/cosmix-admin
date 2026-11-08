import prismadb from "@/lib/prismadb";
import { stripe } from "@/lib/stripe";
import { PLATFORM_FEE_RATE, eligibleBookingsWhere } from "@/lib/payouts";

// Stripe Connect payouts: customers pay the platform (checkout is unchanged),
// and a provider's earnings are sent to their own Stripe account with one
// transfer per booking ("separate charges and transfers"). Providers create
// that account only when they first want to withdraw.
//
// This platform must create connected accounts with Accounts v2 (Stripe
// rejects v1 `type: express` for new platforms). Everything else - account
// links, login links, retrieving status, transfers - works with v1 calls on
// the v2 account id.

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://www.kosmiks.com";
const STRIPE_V2_VERSION = "2026-10-28.preview";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Creates the provider's Stripe account (recipient of transfers, Express dashboard). */
async function createRecipientAccount(user: { id: string; email: string; name: string | null }) {
  const res = await fetch("https://api.stripe.com/v2/core/accounts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Stripe-Version": STRIPE_V2_VERSION,
      "Content-Type": "application/json",
      // A double tap must not create two accounts for one provider.
      "Idempotency-Key": `kosmiks-recipient-${user.id}`,
    },
    body: JSON.stringify({
      contact_email: user.email,
      ...(user.name && { display_name: user.name }),
      identity: { country: "fi" },
      configuration: {
        recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } },
      },
      // The platform carries losses and pays Stripe's fees (required for
      // separate charges and transfers).
      defaults: { currency: "eur", responsibilities: { fees_collector: "application", losses_collector: "application" } },
      dashboard: "express",
      metadata: { userId: user.id },
    }),
  });
  const body = await res.json();
  if (!res.ok || !body.id) {
    throw new Error(`Stripe account creation failed: ${body?.error?.message ?? res.status}`);
  }
  return body.id as string;
}

/** The provider's Stripe account id, creating the account on first use. */
export async function ensureStripeAccount(user: { id: string; email: string; name: string | null; stripeAccountId: string | null }) {
  if (user.stripeAccountId) return user.stripeAccountId;
  const accountId = await createRecipientAccount(user);
  await prismadb.user.update({ where: { id: user.id }, data: { stripeAccountId: accountId } });
  return accountId;
}

/** Stripe-hosted onboarding; it returns to /callback/stripe/*, which hands back to the app. */
export async function onboardingLink(accountId: string) {
  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${APP_URL}/callback/stripe/refresh`,
    return_url: `${APP_URL}/callback/stripe/success`,
  });
  return link.url;
}

/** One-time link into the provider's Stripe (Express) dashboard. */
export async function dashboardLink(accountId: string) {
  const link = await stripe.accounts.createLoginLink(accountId);
  return link.url;
}

export type StripeStatus = {
  connected: boolean;          // an account exists
  detailsSubmitted: boolean;   // onboarding finished
  payoutsEnabled: boolean;     // Stripe can pay out to their bank
  transfersActive: boolean;    // we can send them money
};

/** Reads the account from Stripe and stores the flags on the user. */
export async function syncStripeStatus(user: { id: string; stripeAccountId: string | null }): Promise<StripeStatus> {
  if (!user.stripeAccountId) {
    return { connected: false, detailsSubmitted: false, payoutsEnabled: false, transfersActive: false };
  }
  const account = await stripe.accounts.retrieve(user.stripeAccountId);
  const status: StripeStatus = {
    connected: true,
    detailsSubmitted: !!account.details_submitted,
    payoutsEnabled: !!account.payouts_enabled,
    transfersActive: account.capabilities?.transfers === "active",
  };
  await prismadb.user.update({
    where: { id: user.id },
    data: { stripeDetailsSubmitted: status.detailsSubmitted, stripePayoutsEnabled: status.transfersActive },
  });
  return status;
}

export type WithdrawResult =
  | { ok: true; payoutId: string; amount: number; bookings: number; failed: number }
  | { ok: false; reason: "nothing_available" | "stripe_not_ready" | "all_transfers_failed"; message: string };

/**
 * Sends the provider's available balance to their Stripe account.
 *
 * The eligible bookings (paid online, appointment passed, not paid out) are
 * claimed into one `processing` Payout first, so a double tap can't pay them
 * twice. Then each booking gets its own transfer with the booking's charge as
 * `source_transaction` - the transfer goes through even while that charge's
 * funds are still pending in the platform balance. A booking whose transfer
 * fails is released back to the balance.
 */
export async function withdrawBalance(
  user: { id: string; stripeAccountId: string | null },
  saloonId: string,
): Promise<WithdrawResult> {
  const status = await syncStripeStatus(user);
  if (!status.transfersActive || !user.stripeAccountId) {
    return { ok: false, reason: "stripe_not_ready", message: "Finish setting up payouts with Stripe first." };
  }
  const destination = user.stripeAccountId;

  const claimed = await prismadb.$transaction(async (tx) => {
    const bookings = await tx.booking.findMany({
      where: eligibleBookingsWhere(saloonId),
      select: { id: true, totalAmount: true, paymentIntentId: true },
    });
    const payable = bookings.filter((b) => b.paymentIntentId && (b.totalAmount ?? 0) > 0);
    if (payable.length === 0) return null;

    const gross = round2(payable.reduce((s, b) => s + (b.totalAmount ?? 0), 0));
    const payout = await tx.payout.create({
      data: {
        userId: user.id,
        saloonId,
        gross,
        fee: round2(gross * PLATFORM_FEE_RATE),
        amount: round2(gross - round2(gross * PLATFORM_FEE_RATE)),
        status: "processing",
        scheduledFor: new Date(),
        stripeAccountId: destination,
      },
    });
    const { count } = await tx.booking.updateMany({
      where: { id: { in: payable.map((b) => b.id) }, payoutId: null },
      data: { payoutId: payout.id },
    });
    if (count !== payable.length) throw new Error("Bookings changed during withdrawal");
    return { payout, bookings: payable };
  });

  if (!claimed) {
    return { ok: false, reason: "nothing_available", message: "There is nothing to withdraw yet." };
  }

  const { payout, bookings } = claimed;
  let gross = 0;
  let fee = 0;
  let sent = 0;
  let lastError = "";

  for (const booking of bookings) {
    const bookingGross = round2(booking.totalAmount ?? 0);
    const bookingFee = round2(bookingGross * PLATFORM_FEE_RATE);
    try {
      const intent = await stripe.paymentIntents.retrieve(booking.paymentIntentId!);
      const charge = typeof intent.latest_charge === "string" ? intent.latest_charge : intent.latest_charge?.id;
      if (!charge) throw new Error("Payment has no charge");

      const transfer = await stripe.transfers.create(
        {
          amount: Math.round((bookingGross - bookingFee) * 100),
          currency: "eur",
          destination,
          source_transaction: charge,
          transfer_group: payout.id,
          metadata: { bookingId: booking.id, payoutId: payout.id },
        },
        { idempotencyKey: `booking-transfer-${booking.id}` },
      );
      await prismadb.booking.update({ where: { id: booking.id }, data: { transferId: transfer.id } });
      gross += bookingGross;
      fee += bookingFee;
      sent++;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.error("[WITHDRAW] transfer failed", booking.id, lastError);
      await prismadb.booking.update({ where: { id: booking.id }, data: { payoutId: null } });
    }
  }

  gross = round2(gross);
  fee = round2(fee);
  if (sent === 0) {
    await prismadb.payout.update({
      where: { id: payout.id },
      data: { status: "failed", failedAt: new Date(), failureReason: lastError.slice(0, 300), gross: 0, fee: 0, amount: 0 },
    });
    return { ok: false, reason: "all_transfers_failed", message: "The transfer didn't go through. Please try again later." };
  }

  const amount = round2(gross - fee);
  await prismadb.payout.update({
    where: { id: payout.id },
    data: { status: "transferred", sentAt: new Date(), gross, fee, amount },
  });
  return { ok: true, payoutId: payout.id, amount, bookings: sent, failed: bookings.length - sent };
}

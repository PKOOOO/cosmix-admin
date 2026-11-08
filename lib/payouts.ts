import prismadb from "@/lib/prismadb";
import { getEndUser } from "@/lib/admin-access";

// Provider payouts: which bookings count towards a provider's balance, and how
// a balance becomes a Payout record (via a Stripe Connect withdrawal, see
// lib/stripe-connect.ts).
//
// A booking is paid out at most once: creating a payout stamps its id onto the
// bookings it covers (Booking.payoutId), and only bookings with no payoutId are
// eligible for the next one.

export const PLATFORM_FEE_RATE = 0.1;

/** Booking statuses whose money belongs to the provider. `pending` = not paid yet. */
export const EARNING_STATUSES = ["confirmed", "completed", "no_show"];

/** Statuses of the old manual SEPA payouts (admin moves them along by hand). */
export const PAYOUT_STATUSES = ["scheduled", "sent", "arrived", "failed"] as const;
/** Stripe Connect withdrawals (lib/stripe-connect.ts) are processing → transferred | failed. */
export const ALL_PAYOUT_STATUSES = [...PAYOUT_STATUSES, "processing", "transferred"] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

/** Allowed status changes. `failed` releases the bookings back to the balance. */
export const PAYOUT_TRANSITIONS: Record<PayoutStatus, PayoutStatus[]> = {
  scheduled: ["sent", "failed"],
  sent: ["arrived", "failed"],
  arrived: [],
  failed: [],
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function split(gross: number, rate = PLATFORM_FEE_RATE) {
  const g = round2(gross);
  const fee = round2(g * rate);
  return { gross: g, fee, amount: round2(g - fee) };
}

/**
 * Bookings whose earnings are owed to the provider and not yet paid out:
 * paid online (pay-at-venue money already went to the provider), in an
 * earning status, already taken place, and not in a payout.
 */
const eligibleFilter = (now: Date) => ({
  payoutId: null,
  paymentMethod: "online",
  status: { in: EARNING_STATUSES },
  bookingTime: { lte: now },
});

export const eligibleBookingsWhere = (saloonId: string, now = new Date()) => ({
  saloonId,
  ...eligibleFilter(now),
});

/** Paid online but still in the future — becomes eligible after it happens. */
export const upcomingBookingsWhere = (saloonId: string, now = new Date()) => ({
  saloonId,
  payoutId: null,
  paymentMethod: "online",
  status: { in: EARNING_STATUSES },
  bookingTime: { gt: now },
});

export async function balanceForSaloon(saloonId: string, now = new Date()) {
  const [eligible, upcoming] = await Promise.all([
    prismadb.booking.aggregate({
      where: eligibleBookingsWhere(saloonId, now),
      _sum: { totalAmount: true },
      _count: true,
    }),
    prismadb.booking.aggregate({
      where: upcomingBookingsWhere(saloonId, now),
      _sum: { totalAmount: true },
      _count: true,
    }),
  ]);
  const available = split(eligible._sum.totalAmount ?? 0);
  const next = split(upcoming._sum.totalAmount ?? 0);
  return {
    available: available.amount,
    availableGross: available.gross,
    availableFee: available.fee,
    availableCount: eligible._count,
    upcoming: next.amount,
    upcomingCount: upcoming._count,
    feeRate: PLATFORM_FEE_RATE,
  };
}

/**
 * A signed-in human admin. Deliberately stricter than requireAdmin(): the
 * bearer key ships inside the app, so it must never be enough to move money.
 */
export async function requireHumanAdmin() {
  const user = await getEndUser();
  if (!user || !user.isAdmin) return null;
  return user;
}

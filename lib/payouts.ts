import prismadb from "@/lib/prismadb";
import { getEndUser } from "@/lib/admin-access";

// Provider payouts: which bookings count towards a provider's balance, and how
// a balance becomes a Payout record.
//
// A booking is paid out at most once: creating a payout stamps its id onto the
// bookings it covers (Booking.payoutId), and only bookings with no payoutId are
// eligible for the next one.

export const PLATFORM_FEE_RATE = 0.1;

/** Booking statuses whose money belongs to the provider. `pending` = not paid yet. */
export const EARNING_STATUSES = ["confirmed", "completed", "no_show"];

export const PAYOUT_STATUSES = ["scheduled", "sent", "arrived", "failed"] as const;
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

export type PayoutRunResult = {
  created: { payoutId: string; saloonId: string; amount: number; bookings: number }[];
  skipped: { saloonId: string; reason: string }[];
};

/**
 * Creates a `scheduled` payout for every provider with an available balance.
 * Safe to run more than once: bookings already claimed by a payout are no
 * longer eligible, so a second run the same day creates nothing new.
 */
export async function runPayouts(now = new Date()): Promise<PayoutRunResult> {
  const result: PayoutRunResult = { created: [], skipped: [] };

  const saloons = await prismadb.saloon.findMany({
    where: { bookings: { some: eligibleFilter(now) } },
    select: { id: true, userId: true },
  });

  for (const saloon of saloons) {
    try {
      const application = await prismadb.providerApplication.findUnique({
        where: { userId: saloon.userId },
        select: { iban: true, bankAccountName: true },
      });
      if (!application?.iban) {
        result.skipped.push({ saloonId: saloon.id, reason: "No IBAN on file" });
        continue;
      }

      const payout = await prismadb.$transaction(async (tx) => {
        const bookings = await tx.booking.findMany({
          where: eligibleBookingsWhere(saloon.id, now),
          select: { id: true, totalAmount: true },
        });
        if (bookings.length === 0) return null;

        const totals = split(bookings.reduce((s, b) => s + (b.totalAmount ?? 0), 0));
        if (totals.amount <= 0) return null;

        const created = await tx.payout.create({
          data: {
            userId: saloon.userId,
            saloonId: saloon.id,
            gross: totals.gross,
            fee: totals.fee,
            amount: totals.amount,
            status: "scheduled",
            scheduledFor: now,
            iban: application.iban!,
            bankAccountName: application.bankAccountName,
          },
        });

        // Claim the bookings. `payoutId: null` in the filter means a booking
        // claimed by a concurrent run is skipped; if any were, roll back.
        const claimed = await tx.booking.updateMany({
          where: { id: { in: bookings.map(b => b.id) }, payoutId: null },
          data: { payoutId: created.id },
        });
        if (claimed.count !== bookings.length) {
          throw new Error("Bookings changed during payout run");
        }
        return { payout: created, count: bookings.length };
      });

      if (payout) {
        result.created.push({
          payoutId: payout.payout.id,
          saloonId: saloon.id,
          amount: payout.payout.amount,
          bookings: payout.count,
        });
      }
    } catch (error) {
      console.error("[PAYOUT_RUN] saloon failed:", saloon.id, error);
      result.skipped.push({ saloonId: saloon.id, reason: "Error creating payout" });
    }
  }

  return result;
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

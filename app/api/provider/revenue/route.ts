import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { getEndUser } from "@/lib/admin-access";
import { balanceForSaloon, PLATFORM_FEE_RATE } from "@/lib/payouts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Token",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
  try {
    const user = await getEndUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const saloon = await prismadb.saloon.findFirst({
      where: { userId: user.id },
      select: { id: true, name: true },
    });

    if (!saloon) {
      return NextResponse.json({ error: "No saloon found" }, { status: 404, headers: corsHeaders });
    }

    const bookings = await prismadb.booking.findMany({
      where: { saloonId: saloon.id },
      orderBy: { bookingTime: "desc" },
      select: {
        id: true,
        totalAmount: true,
        status: true,
        bookingTime: true,
        customerName: true,
        paymentMethod: true,
        payoutId: true,
        service: { select: { name: true } },
        user: { select: { name: true, email: true } },
      },
    });

    // Unpaid (`pending`) and cancelled bookings aren't revenue.
    const confirmedBookings = bookings.filter((b) => b.status !== "cancelled" && b.status !== "pending");
    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + (b.totalAmount ?? 0), 0);
    const platformFeeRate = PLATFORM_FEE_RATE;
    const platformFee = Math.round(totalRevenue * platformFeeRate * 100) / 100;

    const [balance, payoutRows] = await Promise.all([
      balanceForSaloon(saloon.id),
      prismadb.payout.findMany({
        where: { userId: user.id },
        orderBy: { scheduledFor: "desc" },
        take: 50,
        include: { bookings: { select: { id: true } } },
      }),
    ]);
    const payouts = payoutRows.map(({ bookings: included, ...p }) => ({
      ...p,
      bookingIds: included.map((b) => b.id),
    }));

    const application = await prismadb.providerApplication.findUnique({
      where: { userId: user.id },
      select: { iban: true, bankAccountName: true },
    });

    return NextResponse.json(
      {
        saloon: { id: saloon.id, name: saloon.name },
        totalRevenue,
        platformFee,
        platformFeeRate,
        // What will be paid in the next payout. (Older app builds read this.)
        pendingBalance: balance.available,
        balance,
        payouts,
        bookingsCount: confirmedBookings.length,
        bookings,
        payout: {
          iban: application?.iban ?? null,
          bankAccountName: application?.bankAccountName ?? null,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[PROVIDER_REVENUE_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { getEndUser } from "@/lib/admin-access";
import { ADMIN_EXTERNAL_ID } from "@/lib/service-auth";

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

    const rows = await prismadb.booking.findMany({
      where: { saloonId: saloon.id },
      orderBy: { bookingTime: "desc" },
      select: {
        id: true,
        serviceId: true,
        totalAmount: true,
        status: true,
        bookingTime: true,
        customerName: true,
        customerPhone: true,
        customerEmail: true,
        notes: true,
        paymentMethod: true,
        paymentIntentId: true,
        cancelReason: true,
        refundId: true,
        payoutId: true,
        service: { select: { name: true } },
        user: { select: { name: true, email: true, clerkId: true } },
      },
    });

    // Service durations, for the booking's end time.
    const durations = new Map(
      (await prismadb.saloonService.findMany({
        where: { saloonId: saloon.id },
        select: { serviceId: true, durationMinutes: true },
      })).map((s) => [s.serviceId, s.durationMinutes])
    );

    const bookings = rows.map(({ user: account, paymentIntentId, refundId, payoutId, serviceId, ...booking }) => ({
      ...booking,
      durationMinutes: durations.get(serviceId) ?? null,
      // Guest bookings sit on the internal service account: never show its
      // name or synthetic email as the customer's.
      user: account && account.clerkId !== ADMIN_EXTERNAL_ID
        ? { name: account.name, email: account.email }
        : null,
      paid: booking.paymentMethod === "online" && !!paymentIntentId && booking.status !== "pending",
      refunded: !!refundId,
      paidOut: !!payoutId,
    }));

    return NextResponse.json(
      { saloon: { id: saloon.id, name: saloon.name }, bookings },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[PROVIDER_BOOKINGS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

export const runtime = "nodejs";

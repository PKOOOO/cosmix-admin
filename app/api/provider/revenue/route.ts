import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { checkAdminAccess } from "@/lib/admin-access";

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
    const { user } = await checkAdminAccess();
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
        service: { select: { name: true } },
        user: { select: { name: true, email: true } },
      },
    });

    const confirmedBookings = bookings.filter((b) => b.status !== "cancelled");
    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + (b.totalAmount ?? 0), 0);

    return NextResponse.json(
      {
        saloon: { id: saloon.id, name: saloon.name },
        totalRevenue,
        bookingsCount: confirmedBookings.length,
        bookings,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[PROVIDER_REVENUE_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { checkAdminAccess } from "@/lib/admin-access";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Token",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function PUT(
  req: Request,
  { params }: { params: { bookingId: string } }
) {
  try {
    const { user } = await checkAdminAccess();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const { status } = await req.json();
    if (!status || !["confirmed", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400, headers: corsHeaders });
    }

    // Verify the booking belongs to this provider's saloon
    const saloon = await prismadb.saloon.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!saloon) {
      return NextResponse.json({ error: "No saloon found" }, { status: 404, headers: corsHeaders });
    }

    const booking = await prismadb.booking.findUnique({
      where: { id: params.bookingId },
      select: { saloonId: true },
    });

    if (!booking || booking.saloonId !== saloon.id) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404, headers: corsHeaders });
    }

    const updated = await prismadb.booking.update({
      where: { id: params.bookingId },
      data: { status, updatedAt: new Date() },
      select: {
        id: true,
        status: true,
        bookingTime: true,
        customerName: true,
        totalAmount: true,
      },
    });

    return NextResponse.json(updated, { headers: corsHeaders });
  } catch (error) {
    console.error("[PROVIDER_BOOKING_PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

export const runtime = "nodejs";

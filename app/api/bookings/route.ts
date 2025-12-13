// app/api/bookings/route.ts
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { requireServiceUser } from "@/lib/service-auth";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
    try {
        const serviceUser = await requireServiceUser();
        const body = await req.json();

        const { serviceId, bookingTime, saloonId } = body;

        if (!serviceId || !bookingTime || !saloonId) {
            return new NextResponse("Service ID, booking time, and saloon ID are required", { status: 400 });
        }

        // Verify the saloon exists
        const saloon = await prismadb.saloon.findUnique({
            where: { id: saloonId }
        });

        if (!saloon) {
            return new NextResponse("Saloon not found", { status: 404 });
        }

        const booking = await prismadb.booking.create({
            data: {
                userId: serviceUser.id, // Attach to service admin user
                serviceId,
                saloonId,
                bookingTime,
                status: 'confirmed',
                paymentMethod: 'pay_at_venue',
            },
        });

        return NextResponse.json(booking);

    } catch (error) {
        console.log("[BOOKING_POST]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        // Require bearer auth; returns synthetic admin user
        await requireServiceUser();

        const bookings = await prismadb.booking.findMany({
            include: {
                service: { select: { name: true } },
                user: { select: { name: true, email: true } },
                saloon: { select: { name: true } },
            },
            orderBy: { bookingTime: "asc" },
        });

        // Get all reviews to check which bookings have been reviewed
        const reviews = await prismadb.saloonReview.findMany({
            select: {
                userId: true,
                saloonId: true,
            },
        });

        // Create a Set of reviewed user+saloon combinations for quick lookup
        const reviewedSet = new Set(
            reviews.map((r) => `${r.userId}-${r.saloonId}`)
        );

        // Add hasReview flag to each booking
        const bookingsWithReviewStatus = bookings.map((booking) => ({
            ...booking,
            hasReview: reviewedSet.has(`${booking.userId}-${booking.saloonId}`),
        }));

        return NextResponse.json(bookingsWithReviewStatus, { headers: corsHeaders });

    } catch (error) {
        console.log("[BOOKINGS_GET]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";

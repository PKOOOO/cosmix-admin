// app/api/bookings/route.ts
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { checkAdminAccess } from "@/lib/admin-access";
import { ADMIN_EXTERNAL_ID } from "@/lib/service-auth";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(req: Request) {
    try {
        const { user, isAdmin } = await checkAdminAccess();
        // The bearer key alone (service user) is not a person: it never sees bookings.
        if (!user || user.clerkId === ADMIN_EXTERNAL_ID) {
            return new NextResponse("Unauthorized", { status: 401, headers: corsHeaders });
        }

        // Admins see everything; everyone else only their own bookings — by
        // account, or by email for guest checkouts made before signing in.
        const bookings = await prismadb.booking.findMany({
            where: isAdmin
                ? undefined
                : { OR: [{ userId: user.id }, { customerEmail: user.email }] },
            include: {
                service: { select: { name: true } },
                user: { select: { name: true, email: true } },
                saloon: { select: { name: true } },
            },
            orderBy: { bookingTime: "asc" },
        });

        // Get all reviews to check which bookings have been reviewed
        // Create a set of reviewed booking IDs for efficient lookup
        const bookingIds = bookings.map(b => b.id);
        const reviews = await prismadb.saloonReview.findMany({
            where: {
                bookingId: { in: bookingIds }
            },
            select: { bookingId: true }
        });

        const reviewedBookingIds = new Set(reviews.map(r => r.bookingId).filter(Boolean));

        const bookingsWithReviewStatus = bookings.map((booking) => ({
            ...booking,
            hasReview: reviewedBookingIds.has(booking.id),
        }));

        return NextResponse.json(bookingsWithReviewStatus, { headers: corsHeaders });

    } catch (error) {
        console.log("[BOOKINGS_GET]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";

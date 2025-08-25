// app\api\[storeId]\bookings\[bookingId]\route.ts
import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function PATCH(
    req: Request,
    { params }: { params: { storeId: string; bookingId: string } }
) {
    try {
        const { userId } = auth();
        const body = await req.json();

        const { status } = body;

        if (!userId) {
            return new NextResponse("Unauthenticated", { status: 401 });
        }
        if (!status) {
            return new NextResponse("Status is required", { status: 400 });
        }
        if (!params.storeId || !params.bookingId) {
            return new NextResponse("Store ID and Booking ID are required", { status: 400 });
        }

        // Find the user record using Clerk ID
        const user = await prismadb.user.findUnique({
            where: {
                clerkId: userId
            }
        });

        if (!user) {
            return new NextResponse("User not found", { status: 401 });
        }

        const storeByUserId = await prismadb.store.findFirst({
            where: {
                id: params.storeId,
                userId: user.id, // Use database user ID
            },
        });

        if (!storeByUserId) {
            return new NextResponse("Unauthorized", { status: 403 });
        }

        const booking = await prismadb.booking.update({
            where: {
                id: params.bookingId,
                storeId: params.storeId,
            },
            data: {
                status,
            },
        });

        return NextResponse.json(booking);

    } catch (error) {
        console.log("[BOOKING_PATCH]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";
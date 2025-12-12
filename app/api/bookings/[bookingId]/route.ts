// app/api/bookings/[bookingId]/route.ts
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { requireServiceUser } from "@/lib/service-auth";

export async function GET(
    req: Request,
    { params }: { params: { bookingId: string } }
) {
    try {
        if (!params.bookingId) {
            return new NextResponse("Booking ID is required", { status: 400 });
        }

        const booking = await prismadb.booking.findUnique({
            where: {
                id: params.bookingId,
            },
            include: {
                service: {
                    include: {
                        category: true,
                    }
                },
                user: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
                saloon: {
                    select: {
                        name: true,
                        address: true,
                    },
                },
            }
        });

        if (!booking) {
            return new NextResponse("Booking not found", { status: 404 });
        }

        return NextResponse.json(booking);
    } catch (error) {
        console.log("[BOOKING_GET]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: { bookingId: string } }
) {
    try {
        // Require service admin (bearer) for now
        const serviceUser = await requireServiceUser(req as any);
        const body = await req.json();

        const { status, bookingTime, notes } = body;

        if (!params.bookingId) {
            return new NextResponse("Booking ID is required", { status: 400 });
        }

        // Update the booking
        const booking = await prismadb.booking.update({
            where: {
                id: params.bookingId,
            },
            data: {
                ...(status && { status }),
                ...(bookingTime && { bookingTime }),
                ...(notes && { notes }),
                updatedAt: new Date(),
            },
        });

        return NextResponse.json(booking);
    } catch (error) {
        console.log('[BOOKING_PATCH]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { bookingId: string } }
) {
    try {
        // Require service admin (bearer) for now
        const serviceUser = await requireServiceUser(req as any);

        if (!params.bookingId) {
            return new NextResponse("Booking ID is required", { status: 400 });
        }

        // Delete the booking
        const booking = await prismadb.booking.delete({
            where: {
                id: params.bookingId,
            },
        });

        return NextResponse.json(booking);
    } catch (error) {
        console.log("[BOOKING_DELETE]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";

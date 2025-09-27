// app/api/bookings/[bookingId]/route.ts
import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

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
        const { userId } = auth();
        const body = await req.json();

        const { status, bookingTime, notes } = body;

        if (!userId) {
            return new NextResponse("Unauthenticated", { status: 401 });
        }

        if (!params.bookingId) {
            return new NextResponse("Booking ID is required", { status: 400 });
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

        // Check if the user has access to this booking (either owns the booking or owns the saloon)
        const bookingAccess = await prismadb.booking.findFirst({
            where: {
                id: params.bookingId,
                OR: [
                    { userId: user.id }, // User owns the booking
                    { 
                        saloon: {
                            userId: user.id // User owns the saloon
                        }
                    }
                ]
            }
        });

        if (!bookingAccess) {
            return new NextResponse("Unauthorized", { status: 403 });
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
        const { userId } = auth();

        if (!userId) {
            return new NextResponse("Unauthenticated", { status: 401 });
        }

        if (!params.bookingId) {
            return new NextResponse("Booking ID is required", { status: 400 });
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

        // Check if the user has access to this booking (either owns the booking or owns the saloon)
        const bookingAccess = await prismadb.booking.findFirst({
            where: {
                id: params.bookingId,
                OR: [
                    { userId: user.id }, // User owns the booking
                    { 
                        saloon: {
                            userId: user.id // User owns the saloon
                        }
                    }
                ]
            }
        });

        if (!bookingAccess) {
            return new NextResponse("Unauthorized", { status: 403 });
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

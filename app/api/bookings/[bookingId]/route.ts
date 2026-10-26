import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { checkAdminAccess } from "@/lib/admin-access";
import { formatWhen, notifyUser } from "@/lib/send-notification";

export async function GET(
    req: Request,
    { params }: { params: { bookingId: string } }
) {
    try {
        const { isAdmin } = await checkAdminAccess();
        if (!isAdmin) {
            return new NextResponse("Forbidden", { status: 403 });
        }

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
        // Admin only: this changes or deletes ANY booking, including payment
        // status, so it must never be reachable with the app's bearer key.
        const { isAdmin } = await checkAdminAccess();
        if (!isAdmin) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const body = await req.json();

        const { status, bookingTime, notes } = body;

        if (!params.bookingId) {
            return new NextResponse("Booking ID is required", { status: 400 });
        }

        const before = await prismadb.booking.findUnique({
            where: { id: params.bookingId },
            select: { status: true },
        });

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
            include: {
                service: { select: { name: true } },
                saloon: { select: { name: true } },
            },
        });

        // C3: tell the customer when an admin changes the booking's status.
        if (status && before && before.status !== status) {
            const label: Record<string, string> = {
                confirmed: "confirmed",
                cancelled: "cancelled",
                completed: "marked as completed",
                pending: "set back to pending",
            };
            await notifyUser(
                booking.userId,
                "Booking updated",
                `Your ${booking.service?.name ?? "booking"} at ${booking.saloon.name} on ${formatWhen(booking.bookingTime)} was ${label[status] ?? `updated to ${status}`}.`,
                { type: "customer_booking_updated", bookingId: booking.id, status }
            );
        }

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
        // Admin only: this changes or deletes ANY booking, including payment
        // status, so it must never be reachable with the app's bearer key.
        const { isAdmin } = await checkAdminAccess();
        if (!isAdmin) {
            return new NextResponse("Forbidden", { status: 403 });
        }

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

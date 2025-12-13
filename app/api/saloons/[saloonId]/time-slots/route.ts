import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { checkAdminAccess } from "@/lib/admin-access";

export async function GET(
    req: Request,
    { params }: { params: { saloonId: string } }
) {
    try {
        const { user } = await checkAdminAccess();

        if (!user) {
            return new NextResponse("Unauthenticated", { status: 401 });
        }

        const { saloonId } = params;

        // Find the saloon and verify ownership
        const saloon = await prismadb.saloon.findFirst({
            where: {
                id: saloonId,
                userId: user.id
            }
        });

        if (!saloon) {
            return new NextResponse("Saloon not found", { status: 404 });
        }

        // Get time slots for this saloon
        const timeSlots = await prismadb.saloonTimeSlot.findMany({
            where: {
                saloonId: saloonId
            },
            orderBy: {
                dayOfWeek: 'asc'
            }
        });

        return NextResponse.json(timeSlots);

    } catch (error) {
        console.log('[TIME_SLOTS_GET]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export async function POST(
    req: Request,
    { params }: { params: { saloonId: string } }
) {
    try {
        const { user } = await checkAdminAccess();

        if (!user) {
            return new NextResponse("Unauthenticated", { status: 401 });
        }

        const { saloonId } = params;
        const body = await req.json();
        const { timeSlots } = body;

        // Find the saloon and verify ownership
        const saloon = await prismadb.saloon.findFirst({
            where: {
                id: saloonId,
                userId: user.id
            }
        });

        if (!saloon) {
            return new NextResponse("Saloon not found", { status: 404 });
        }

        // Delete existing time slots for this saloon
        await prismadb.saloonTimeSlot.deleteMany({
            where: {
                saloonId: saloonId
            }
        });

        // Create new time slots
        const createdTimeSlots = await Promise.all(
            timeSlots.map((slot: any) =>
                prismadb.saloonTimeSlot.create({
                    data: {
                        saloonId: saloonId,
                        dayOfWeek: slot.dayOfWeek,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        isOpen: slot.isOpen,
                        slotDurationMinutes: slot.slotDurationMinutes || 30,
                        breakTimeMinutes: slot.breakTimeMinutes || 15,
                        maxBookingsPerSlot: slot.maxBookingsPerSlot || 1,
                    }
                })
            )
        );

        return NextResponse.json(createdTimeSlots);

    } catch (error) {
        console.log('[TIME_SLOTS_POST]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";

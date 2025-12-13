// app/api/users/[userId]/bookings/route.ts

import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { checkAdminAccess } from "@/lib/admin-access";

export async function GET(
    req: Request,
    { params }: { params: { userId: string } }
) {
    try {
        const { user } = await checkAdminAccess();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (!params.userId) {
            return new NextResponse("User ID is required", { status: 400 });
        }

        // Determine if params.userId is DB ID or Clerk ID
        let targetUserId = params.userId;

        // If the param matches the authenticated user's Clerk ID, use their DB ID
        if (params.userId === user.clerkId) {
            targetUserId = user.id;
        }
        // If it doesn't match Clerk ID, it must match DB ID
        else if (params.userId !== user.id) {
            return new NextResponse("Unauthorized", { status: 403 });
        }

        const bookings = await prismadb.booking.findMany({
            where: {
                userId: targetUserId,
            },
            include: {
                service: {
                    select: {
                        name: true,
                        description: true,
                    },
                },
                saloon: {
                    select: {
                        name: true,
                        address: true,
                    },
                },
            },
            orderBy: {
                bookingTime: "desc",
            },
        });

        return NextResponse.json(bookings);

    } catch (error) {
        console.log("[USER_BOOKINGS_GET]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}
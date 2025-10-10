// app/api/users/[userId]/bookings/route.ts

import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function GET(
    req: Request,
    { params }: { params: { userId: string } }
) {
    try {
        const { userId } = auth();

        if (!userId || userId !== params.userId) {
            return new NextResponse("Unauthorized", { status: 403 });
        }
        if (!params.userId) {
            return new NextResponse("User ID is required", { status: 400 });
        }

        const bookings = await prismadb.booking.findMany({
            where: {
                userId: params.userId,
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
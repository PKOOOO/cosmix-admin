import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { requireAdmin } from "@/lib/admin-access";

export async function GET() {
    try {
        await requireAdmin();

        const saloons = await prismadb.saloon.findMany({
            select: {
                id: true,
                name: true,
                address: true,
                latitude: true,
                longitude: true,
                shortIntro: true,
                createdAt: true,
                images: { select: { url: true }, take: 1, orderBy: { createdAt: 'asc' } },
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                },
                _count: {
                    select: {
                        images: true,
                        bookings: true,
                        reviews: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(saloons);

    } catch (error) {
        console.log('[ADMIN_SALOONS_GET]', error);
        if (error instanceof Error && error.message === "Admin access required") {
            return new NextResponse("Admin access required", { status: 403 });
        }
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { requireAdmin } from "@/lib/admin-access";

// GET /api/admin/saloons/:saloonId — everything the admin salon page shows.
export async function GET(_req: Request, { params }: { params: { saloonId: string } }) {
    try {
        await requireAdmin();

        const saloon = await prismadb.saloon.findUnique({
            where: { id: params.saloonId },
            select: {
                id: true,
                name: true,
                shortIntro: true,
                description: true,
                address: true,
                latitude: true,
                longitude: true,
                rating: true,
                createdAt: true,
                userId: true,
                user: { select: { name: true, email: true, providerStatus: true } },
                images: { select: { id: true, url: true }, orderBy: { createdAt: 'asc' } },
                saloonServices: {
                    select: {
                        serviceId: true,
                        price: true,
                        durationMinutes: true,
                        isAvailable: true,
                        service: { select: { name: true, category: { select: { name: true } } } },
                    },
                    orderBy: { createdAt: 'asc' },
                },
                bookings: {
                    select: {
                        id: true,
                        bookingTime: true,
                        status: true,
                        totalAmount: true,
                        customerName: true,
                        service: { select: { name: true } },
                    },
                    orderBy: { bookingTime: 'desc' },
                    take: 15,
                },
                _count: { select: { bookings: true, reviews: true } },
            },
        });

        if (!saloon) return new NextResponse("Not found", { status: 404 });

        const [application, revenue] = await Promise.all([
            prismadb.providerApplication.findUnique({
                where: { userId: saloon.userId },
                select: { phone: true, city: true, neighbourhood: true },
            }),
            prismadb.booking.aggregate({
                where: { saloonId: saloon.id, status: { notIn: ['pending', 'cancelled'] } },
                _sum: { totalAmount: true },
                _count: true,
            }),
        ]);

        return NextResponse.json({
            ...saloon,
            owner: {
                name: saloon.user?.name ?? null,
                email: saloon.user?.email ?? null,
                phone: application?.phone ?? null,
                city: application?.city ?? null,
                neighbourhood: application?.neighbourhood ?? null,
            },
            revenue: revenue._sum.totalAmount ?? 0,
            paidBookings: revenue._count,
        });
    } catch (error) {
        console.log('[ADMIN_SALOON_GET]', error);
        if (error instanceof Error && error.message === "Admin access required") {
            return new NextResponse("Admin access required", { status: 403 });
        }
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";

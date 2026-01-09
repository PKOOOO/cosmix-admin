import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { requireAdmin } from "@/lib/admin-access";

export async function GET() {
    try {
        await requireAdmin();

        // Get counts for admin dashboard
        const [
            globalCategoriesCount,
            parentServicesCount,
            totalSaloonsCount,
            totalUsersCount,
            revenueResult
        ] = await Promise.all([
            // Global categories count
            prismadb.category.count({
                where: { isGlobal: true }
            }),
            // Parent services count (services without parentServiceId)
            prismadb.service.count({
                where: { parentServiceId: null }
            }),
            // Total saloons count
            prismadb.saloon.count(),
            // Total users count
            prismadb.user.count(),
            // Total revenue from all bookings
            prismadb.booking.aggregate({
                _sum: {
                    totalAmount: true
                }
            })
        ]);

        const totalRevenue = revenueResult._sum.totalAmount || 0;

        return NextResponse.json({
            globalCategories: globalCategoriesCount,
            parentServices: parentServicesCount,
            totalSaloons: totalSaloonsCount,
            totalUsers: totalUsersCount,
            totalRevenue: totalRevenue
        });

    } catch (error) {
        console.log('[ADMIN_STATS_GET]', error);
        if (error instanceof Error && error.message === "Admin access required") {
            return new NextResponse("Admin access required", { status: 403 });
        }
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";

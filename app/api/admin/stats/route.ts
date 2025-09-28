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
            totalUsersCount
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
            prismadb.user.count()
        ]);

        return NextResponse.json({
            globalCategories: globalCategoriesCount,
            parentServices: parentServicesCount,
            totalSaloons: totalSaloonsCount,
            totalUsers: totalUsersCount
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

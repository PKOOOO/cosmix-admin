import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { requireAdmin } from "@/lib/admin-access";

export async function GET() {
    try {
        await requireAdmin();

        const users = await prismadb.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                isAdmin: true,
                createdAt: true,
                _count: {
                    select: {
                        saloons: true,
                        bookings: true,
                        reviews: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(users);

    } catch (error) {
        console.log('[ADMIN_USERS_GET]', error);
        if (error instanceof Error && error.message === "Admin access required") {
            return new NextResponse("Admin access required", { status: 403 });
        }
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";

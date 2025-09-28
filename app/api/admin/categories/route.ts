import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { requireAdmin } from "@/lib/admin-access";

export async function POST(req: Request) {
    try {
        const user = await requireAdmin();
        const body = await req.json();
        const { name } = body;

        if (!name) {
            return new NextResponse("Name is required", { status: 400 });
        }

        // Check if global category already exists
        const existingCategory = await prismadb.category.findFirst({
            where: {
                name: name,
                isGlobal: true
            }
        });

        if (existingCategory) {
            return new NextResponse("Global category with this name already exists", { status: 409 });
        }

        // Create a new global category
        const category = await prismadb.category.create({
            data: {
                name,
                isGlobal: true,
                saloonId: null // Global categories don't belong to a specific saloon
            }
        });

        return NextResponse.json(category);

    } catch (error) {
        console.log('[ADMIN_CATEGORIES_POST]', error);
        if (error instanceof Error && error.message === "Admin access required") {
            return new NextResponse("Admin access required", { status: 403 });
        }
        return new NextResponse("Internal error", { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        await requireAdmin();

        // Get all global categories
        const categories = await prismadb.category.findMany({
            where: {
                isGlobal: true
            },
            orderBy: {
                createdAt: 'desc',
            }
        });

        return NextResponse.json(categories);

    } catch (error) {
        console.log('[ADMIN_CATEGORIES_GET]', error);
        if (error instanceof Error && error.message === "Admin access required") {
            return new NextResponse("Admin access required", { status: 403 });
        }
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";

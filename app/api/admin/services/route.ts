import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { requireAdmin } from "@/lib/admin-access";

export async function POST(req: Request) {
    try {
        const user = await requireAdmin();
        const body = await req.json();
        const { name, categoryId } = body;

        if (!name) {
            return new NextResponse("Name is required", { status: 400 });
        }

        if (!categoryId) {
            return new NextResponse("Category ID is required", { status: 400 });
        }

        // Verify the category exists and is global
        const category = await prismadb.category.findFirst({
            where: {
                id: categoryId,
                isGlobal: true
            }
        });

        if (!category) {
            return new NextResponse("Global category not found", { status: 404 });
        }

        // Check if parent service already exists with this name in this category
        const existingService = await prismadb.service.findFirst({
            where: {
                name: name,
                categoryId: categoryId,
                parentServiceId: null // Parent services have no parent
            }
        });

        if (existingService) {
            return new NextResponse("Parent service with this name already exists in this category", { status: 409 });
        }

        // Create a new parent service
        const service = await prismadb.service.create({
            data: {
                name,
                categoryId: categoryId,
                parentServiceId: null, // This is a parent service
            }
        });

        return NextResponse.json(service);

    } catch (error) {
        console.log('[ADMIN_SERVICES_POST]', error);
        if (error instanceof Error && error.message === "Admin access required") {
            return new NextResponse("Admin access required", { status: 403 });
        }
        return new NextResponse("Internal error", { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        await requireAdmin();

        // Get all parent services (services without parentServiceId)
        const services = await prismadb.service.findMany({
            where: {
                parentServiceId: null
            },
            include: {
                category: {
                    select: {
                        name: true,
                        isGlobal: true
                    }
                },
                subServices: {
                    select: {
                        id: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc',
            }
        });

        return NextResponse.json(services);

    } catch (error) {
        console.log('[ADMIN_SERVICES_GET]', error);
        if (error instanceof Error && error.message === "Admin access required") {
            return new NextResponse("Admin access required", { status: 403 });
        }
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";

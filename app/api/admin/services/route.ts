import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { requireAdmin } from "@/lib/admin-access";

export async function POST(req: Request) {
    try {
        const user = await requireAdmin();
        const body = await req.json();
        const { name, categoryId, parentServiceId, description } = body;

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

        // If creating a sub-service, validate parent service
        if (parentServiceId) {
            const parentService = await prismadb.service.findFirst({
                where: {
                    id: parentServiceId,
                    parentServiceId: null // Ensure it's actually a parent service
                }
            });

            if (!parentService) {
                return new NextResponse("Parent service not found", { status: 404 });
            }

            // Check if parent service is in the same category
            if (parentService.categoryId !== categoryId) {
                return new NextResponse("Parent service must be in the same category", { status: 400 });
            }

            // Check if sub-service already exists under this parent
            const existingSubService = await prismadb.service.findFirst({
                where: {
                    name: name,
                    parentServiceId: parentServiceId
                }
            });

            if (existingSubService) {
                return new NextResponse("Sub-service with this name already exists under this parent service", { status: 409 });
            }

            // Create a new sub-service
            const service = await prismadb.service.create({
                data: {
                    name,
                    description: description || null,
                    categoryId,
                    parentServiceId: parentServiceId
                }
            });

            return NextResponse.json(service);
        } else {
            // Creating a parent service
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
        }

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

        // Get all services (both parent and sub-services)
        const services = await prismadb.service.findMany({
            where: {
                category: {
                    isGlobal: true
                }
            },
            include: {
                category: {
                    select: {
                        name: true,
                        isGlobal: true
                    }
                },
                parentService: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                subServices: {
                    select: {
                        id: true,
                        name: true
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

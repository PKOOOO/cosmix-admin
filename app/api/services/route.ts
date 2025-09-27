// app/api/services/route.ts
import { auth } from "@clerk/nextjs";
import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

// GET method - Fetch services by category or saloon
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const categoryParam = searchParams.get('category');
        const saloonId = searchParams.get('saloonId');
        const userId = searchParams.get('userId'); // For user-specific services

        if (categoryParam) {
            // Fetch services by category for the user's saloons
            const { userId: clerkUserId } = auth();
            if (!clerkUserId) {
                return new NextResponse("Unauthenticated", { status: 401 });
            }

            const user = await prismadb.user.findUnique({
                where: { clerkId: clerkUserId }
            });

            if (!user) {
                return new NextResponse("User not found", { status: 401 });
            }

            // Find the category by ID or name for this user's saloons
            const category = await prismadb.category.findFirst({
                where: {
                    saloon: {
                        userId: user.id
                    },
                    OR: [
                        { id: categoryParam }, // If it's a category ID
                        { name: categoryParam } // If it's a category name
                    ]
                }
            });

            if (!category) {
                return NextResponse.json(
                    { error: `Category '${categoryParam}' not found` },
                    { status: 404 }
                );
            }

            // Fetch all services for this category, including sub-services
            const services = await prismadb.service.findMany({
                where: {
                    categoryId: category.id,
                },
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true,
                        }
                    },
                    parentService: {
                        select: {
                            id: true,
                            name: true,
                        }
                    },
                    subServices: {
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            isPopular: true,
                        }
                    },
                    saloonServices: {
                        where: {
                            saloonId: saloonId || undefined,
                            saloon: {
                                userId: user.id
                            }
                        },
                        select: {
                            isAvailable: true,
                            saloon: {
                                select: {
                                    id: true,
                                    name: true,
                                    images: true,
                                }
                            }
                        }
                    }
                },
                orderBy: [
                    { parentServiceId: 'asc' }, // Parent services first (nulls first)
                    { name: 'asc' }
                ]
            });

            return NextResponse.json(services);
        } else if (saloonId) {
            // Fetch services for a specific saloon
            const { userId: clerkUserId } = auth();
            if (!clerkUserId) {
                return new NextResponse("Unauthenticated", { status: 401 });
            }

            const user = await prismadb.user.findUnique({
                where: { clerkId: clerkUserId }
            });

            if (!user) {
                return new NextResponse("User not found", { status: 401 });
            }

            // Verify the saloon belongs to the user
            const saloon = await prismadb.saloon.findFirst({
                where: {
                    id: saloonId,
                    userId: user.id
                }
            });

            if (!saloon) {
                return new NextResponse("Saloon not found", { status: 404 });
            }

            // Fetch all services for this saloon through the join table
            const saloonServices = await prismadb.saloonService.findMany({
                where: {
                    saloonId: saloonId,
                },
                include: {
                    service: {
                        include: {
                            category: true,
                            parentService: true,
                            subServices: true,
                        }
                    }
                },
                orderBy: {
                    service: {
                        name: 'asc'
                    }
                }
            });

            // Format the response to include saloon-specific availability
            const services = saloonServices.map(saloonService => ({
                ...saloonService.service,
                isAvailable: saloonService.isAvailable,
            }));

            return NextResponse.json(services);
        } else {
            return NextResponse.json(
                { error: "Either category or saloonId parameter is required" },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error("Error fetching services:", error);
        return NextResponse.json(
            { error: "Failed to fetch services" },
            { status: 500 }
        );
    }
}

// POST method - Create new service and optionally link to multiple saloons
export async function POST(req: Request) {
    try {
        const { userId } = auth();
        const body = await req.json();

        const { 
            name, 
            description, 
            categoryId, 
            isPopular, 
            parentServiceId, 
            saloonIds, // Changed from saloonId to saloonIds array
            isParent
        } = body;

        if (!userId) {
            return new NextResponse("Unauthenticated", { status: 401 });
        }
        if (!name) {
            return new NextResponse("Name is required", { status: 400 });
        }
        if (!categoryId) {
            return new NextResponse("Category ID is required", { status: 400 });
        }
        // Only require saloonIds for non-parent services
        if (!isParent && (!saloonIds || saloonIds.length === 0)) {
            return new NextResponse("At least one saloon is required for non-parent services", { status: 400 });
        }

        // First, find the user record using Clerk ID
        const user = await prismadb.user.findUnique({
            where: {
                clerkId: userId
            }
        });

        if (!user) {
            return new NextResponse("User not found", { status: 401 });
        }

        // Create the service first
        const service = await prismadb.service.create({
            data: {
                name,
                description: isParent ? null : description,
                categoryId,
                isPopular,
                parentServiceId: isParent ? null : parentServiceId,
            },
        });

        // Create saloon-service relationships for non-parent services
        if (!isParent && saloonIds && saloonIds.length > 0) {
            // Verify all saloons belong to the user
            const userSaloons = await prismadb.saloon.findMany({
                where: {
                    id: { in: saloonIds },
                    userId: user.id
                }
            });

            if (userSaloons.length !== saloonIds.length) {
                return new NextResponse("Some saloons not found or not owned by user", { status: 403 });
            }

            // Create multiple saloon-service relationships
            const saloonServiceData = saloonIds.map((saloonId: string) => ({
                saloonId: saloonId,
                serviceId: service.id,
                price: 0, // Default price - can be updated later per saloon
                durationMinutes: 30, // Default duration - can be updated later per saloon
                isAvailable: true,
            }));

            await prismadb.saloonService.createMany({
                data: saloonServiceData,
            });
        }

        return NextResponse.json(service);
        
    } catch (error) {
        console.log("[SERVICE_POST]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}
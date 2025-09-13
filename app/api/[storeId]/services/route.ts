// app/api/[storeId]/services/route.ts
import { auth } from "@clerk/nextjs";
import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

// GET method - Fetch services by category or saloon
export async function GET(
    request: NextRequest,
    { params }: { params: { storeId: string } }
) {
    try {
        const { searchParams } = new URL(request.url);
        const categoryName = searchParams.get('category');
        const saloonId = searchParams.get('saloonId');

        if (categoryName) {
            // Existing category-based fetching
            console.log('Fetching services for store:', params.storeId, 'category:', categoryName);

            // First, find the category by name for this store
            const category = await prismadb.category.findFirst({
                where: {
                    storeId: params.storeId,
                    name: categoryName
                }
            });

            if (!category) {
                return NextResponse.json(
                    { error: `Category '${categoryName}' not found for this store` },
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

            console.log(`Found ${services.length} services for category '${categoryName}'`);

            return NextResponse.json(services);
        } else if (saloonId) {
            // New: Fetch services for a specific saloon
            console.log('Fetching services for saloon:', saloonId);

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

            console.log(`Found ${services.length} services for saloon '${saloonId}'`);

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
export async function POST(
    req: Request,
    { params }: { params: { storeId: string } }
) {
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
        if (!params.storeId) {
            return new NextResponse("Store ID is required", { status: 400 });
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

        // Check if the authenticated user is the owner of the store using database user ID
        const storeByUserId = await prismadb.store.findFirst({
            where: {
                id: params.storeId,
                userId: user.id,
            },
        });

        if (!storeByUserId) {
            return new NextResponse("Unauthorized", { status: 403 });
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

        // Always create the store-service relationship
        await prismadb.storeService.create({
            data: {
                storeId: params.storeId,
                serviceId: service.id,
            },
        });

        // Create saloon-service relationships for non-parent services
        if (!isParent && saloonIds && saloonIds.length > 0) {
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
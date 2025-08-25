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
                            price: true,
                            durationMinutes: true,
                            isAvailable: true,
                            saloon: {
                                select: {
                                    id: true,
                                    name: true,
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

            // Format the response to include saloon-specific pricing and availability
            const services = saloonServices.map(saloonService => ({
                ...saloonService.service,
                saloonPrice: saloonService.price,
                saloonDuration: saloonService.durationMinutes,
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

// POST method - Create new service and optionally link to saloon
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
            price, 
            durationMinutes, 
            isPopular, 
            parentServiceId, 
            saloonId, // Added saloonId
            saloonPrice, // Added saloon-specific price
            saloonDuration // Added saloon-specific duration
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
                userId: user.id, // Use database user ID, not Clerk ID
            },
        });

        if (!storeByUserId) {
            return new NextResponse("Unauthorized", { status: 403 });
        }

        // Create the service first
        const service = await prismadb.service.create({
            data: {
                name,
                description,
                categoryId,
                isPopular,
                parentServiceId,
            },
        });

        // Then, link the new service to the store using the join table
        const storeService = await prismadb.storeService.create({
            data: {
                storeId: params.storeId,
                serviceId: service.id,
            },
        });

        // If saloonId is provided, create a saloon-service relationship
        if (saloonId) {
            await prismadb.saloonService.create({
                data: {
                    saloonId: saloonId,
                    serviceId: service.id,
                    price: saloonPrice || price,
                    durationMinutes: saloonDuration || durationMinutes,
                    isAvailable: true,
                },
            });
        }

        return NextResponse.json(service);
        
    } catch (error) {
        console.log("[SERVICE_POST]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}
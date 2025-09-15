// app/api/[storeId]/services/[serviceId]/route.ts
import { auth, currentUser } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function GET(
    req: Request,
    { params }: { params: { serviceId: string } }
) {
    try {
        if (!params.serviceId) {
            return new NextResponse("Service ID is required", { status: 400 });
        }

        const service = await prismadb.service.findUnique({
            where: {
                id: params.serviceId,
            },
            include: {
                category: true,
                subServices: true,
                parentService: true,
                saloonServices: {
                    include: {
                        saloon: {
                            include: {
                                images: true
                            }
                        }
                    }
                }
            },
        });

        if (!service) {
            return new NextResponse("Service not found", { status: 404 });
        }

        return NextResponse.json(service);

    } catch (error) {
        console.log("[SERVICE_GET]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: { storeId: string; serviceId: string } }
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
        if (!params.storeId || !params.serviceId) {
            return new NextResponse("Store ID and Service ID are required", { status: 400 });
        }

        // Find the user record using Clerk ID
        const user = await prismadb.user.findUnique({
            where: {
                clerkId: userId
            }
        });

        if (!user) {
            return new NextResponse("User not found", { status: 401 });
        }

        const storeByUserId = await prismadb.store.findFirst({
            where: {
                id: params.storeId,
                userId: user.id, // Use database user ID
            },
        });

        if (!storeByUserId) {
            return new NextResponse("Unauthorized", { status: 403 });
        }

        // Update the service with parent-specific logic
        const service = await prismadb.service.update({
            where: {
                id: params.serviceId,
            },
            data: {
                name,
                description: isParent ? null : description,
                categoryId,
                isPopular,
                parentServiceId: isParent ? null : parentServiceId,
            },
        });

        // Always delete existing saloon-service relationships first
        await prismadb.saloonService.deleteMany({
            where: {
                serviceId: params.serviceId,
            },
        });

        // Create new saloon-service relationships for non-parent services
        if (!isParent && saloonIds && saloonIds.length > 0) {
            // Get existing saloon services to preserve price and duration if they exist
            const existingSaloonServices = await prismadb.saloonService.findMany({
                where: {
                    serviceId: params.serviceId,
                    saloonId: {
                        in: saloonIds
                    }
                }
            });

            // Create a map of existing data for preservation
            const existingDataMap = existingSaloonServices.reduce((acc, ss) => {
                acc[ss.saloonId] = {
                    price: ss.price,
                    durationMinutes: ss.durationMinutes,
                    isAvailable: ss.isAvailable
                };
                return acc;
            }, {} as Record<string, { price: number; durationMinutes: number; isAvailable: boolean }>);

            // Create new relationships, preserving existing data where possible
            const saloonServiceData = saloonIds.map((saloonId: string) => ({
                saloonId: saloonId,
                serviceId: params.serviceId,
                price: existingDataMap[saloonId]?.price ?? 0, // Preserve existing price or default to 0
                durationMinutes: existingDataMap[saloonId]?.durationMinutes ?? 30, // Preserve existing duration or default to 30
                isAvailable: existingDataMap[saloonId]?.isAvailable ?? true, // Preserve existing availability or default to true
            }));

            await prismadb.saloonService.createMany({
                data: saloonServiceData,
            });
        }

        return NextResponse.json(service);

    } catch (error) {
        console.log("[SERVICE_PATCH]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { storeId: string; serviceId: string } }
) {
    try {
        const { userId } = auth();

        if (!userId) {
            return new NextResponse("Unauthenticated", { status: 401 });
        }
        if (!params.storeId || !params.serviceId) {
            return new NextResponse("Store ID and Service ID are required", { status: 400 });
        }

        // Ensure the Clerk user exists in our DB (create on the fly if missing)
        let user = await prismadb.user.findUnique({
            where: {
                clerkId: userId
            }
        });

        if (!user) {
            const cu = await currentUser();
            const email = cu?.emailAddresses?.[0]?.emailAddress;
            if (!email) return new NextResponse("User email missing", { status: 401 });
            user = await prismadb.user.create({
                data: {
                    clerkId: userId,
                    email,
                    name: cu?.firstName || cu?.username || null,
                },
            });
        }

        // Check if user owns the store OR if user owns a salon that uses this service
        const storeByUserId = await prismadb.store.findFirst({
            where: {
                id: params.storeId,
                userId: user.id, // Use database user ID
            },
        });

        // If user doesn't own the store, check if they own a salon that uses this service
        if (!storeByUserId) {
            const saloonUsingService = await prismadb.saloonService.findFirst({
                where: {
                    serviceId: params.serviceId,
                    saloon: {
                        userId: user.id,
                    },
                },
            });

            if (!saloonUsingService) {
                return new NextResponse("Unauthorized", { status: 403 });
            }
        }

        // First delete all saloon-service relationships
        await prismadb.saloonService.deleteMany({
            where: {
                serviceId: params.serviceId,
            },
        });

        // Then delete the store-service relationship
        await prismadb.storeService.deleteMany({
            where: {
                serviceId: params.serviceId,
                storeId: params.storeId,
            },
        });

        // Finally delete the service itself
        const service = await prismadb.service.delete({
            where: {
                id: params.serviceId,
            },
        });

        return NextResponse.json(service);

    } catch (error) {
        console.log("[SERVICE_DELETE]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";
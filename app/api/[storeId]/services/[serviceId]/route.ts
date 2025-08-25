// app/api/[storeId]/services/[serviceId]/route.ts
import { auth } from "@clerk/nextjs";
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
                        saloon: true
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

        const service = await prismadb.service.update({
            where: {
                id: params.serviceId,
            },
            data: {
                name,
                description,
                categoryId,
                isPopular,
                parentServiceId,
            },
        });

        // If saloonId is provided, update or create the saloon-service relationship
        if (saloonId) {
            const existingSaloonService = await prismadb.saloonService.findUnique({
                where: {
                    saloonId_serviceId: {
                        saloonId: saloonId,
                        serviceId: params.serviceId,
                    }
                }
            });

            if (existingSaloonService) {
                // Update existing relationship
                await prismadb.saloonService.update({
                    where: {
                        saloonId_serviceId: {
                            saloonId: saloonId,
                            serviceId: params.serviceId,
                        }
                    },
                    data: {
                        price: saloonPrice || price,
                        durationMinutes: saloonDuration || durationMinutes,
                    },
                });
            } else {
                // Create new relationship
                await prismadb.saloonService.create({
                    data: {
                        saloonId: saloonId,
                        serviceId: params.serviceId,
                        price: saloonPrice || price,
                        durationMinutes: saloonDuration || durationMinutes,
                        isAvailable: true,
                    },
                });
            }
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
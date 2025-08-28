// app/api/[storeId]/saloons/[saloonId]/pricing/route.ts
import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function PATCH(
    req: Request,
    { params }: { params: { storeId: string; saloonId: string } }
) {
    try {
        const { userId } = auth();
        const body = await req.json();

        const { servicePricing } = body;

        if (!userId) {
            return new NextResponse("Unauthenticated", { status: 401 });
        }

        if (!servicePricing || !Array.isArray(servicePricing)) {
            return new NextResponse("Service pricing data is required", { status: 400 });
        }

        if (!params.saloonId) {
            return new NextResponse("Saloon ID is required", { status: 400 });
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
                userId: user.id,
            },
        });

        if (!storeByUserId) {
            return new NextResponse("Unauthorized", { status: 403 });
        }

        // Verify the saloon belongs to this store
        const saloon = await prismadb.saloon.findFirst({
            where: {
                id: params.saloonId,
                storeId: params.storeId,
            }
        });

        if (!saloon) {
            return new NextResponse("Saloon not found", { status: 404 });
        }

        // Get current saloon services
        const currentSaloonServices = await prismadb.saloonService.findMany({
            where: {
                saloonId: params.saloonId,
            }
        });

        const currentServiceIds = currentSaloonServices.map(ss => ss.serviceId);
        const newServiceIds = servicePricing.map((sp: any) => sp.serviceId);

        // Remove services that are no longer in the pricing list
        const servicesToRemove = currentServiceIds.filter(id => !newServiceIds.includes(id));
        
        if (servicesToRemove.length > 0) {
            await prismadb.saloonService.deleteMany({
                where: {
                    saloonId: params.saloonId,
                    serviceId: {
                        in: servicesToRemove
                    }
                }
            });
        }

        // Update or create saloon service pricing
        const upsertPromises = servicePricing.map(async (pricing: {
            serviceId: string;
            price: number;
            durationMinutes: number;
            isAvailable: boolean;
        }) => {
            // Verify the service exists and is a sub-service
            const service = await prismadb.service.findFirst({
                where: {
                    id: pricing.serviceId,
                    parentServiceId: { not: null }, // Only allow sub-services
                }
            });

            if (!service) {
                throw new Error(`Service ${pricing.serviceId} not found or is not a sub-service`);
            }

            return prismadb.saloonService.upsert({
                where: {
                    saloonId_serviceId: {
                        saloonId: params.saloonId,
                        serviceId: pricing.serviceId,
                    }
                },
                update: {
                    price: pricing.price,
                    durationMinutes: pricing.durationMinutes,
                    isAvailable: pricing.isAvailable,
                },
                create: {
                    saloonId: params.saloonId,
                    serviceId: pricing.serviceId,
                    price: pricing.price,
                    durationMinutes: pricing.durationMinutes,
                    isAvailable: pricing.isAvailable,
                }
            });
        });

        await Promise.all(upsertPromises);

        // Return updated saloon with pricing
        const updatedSaloon = await prismadb.saloon.findUnique({
            where: {
                id: params.saloonId,
            },
            include: {
                saloonServices: {
                    include: {
                        service: {
                            include: {
                                category: true,
                                parentService: true,
                            }
                        }
                    }
                }
            }
        });

        return NextResponse.json(updatedSaloon);
    } catch (error) {
        console.log("[SALOON_PRICING_PATCH]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

// GET method to fetch current pricing
export async function GET(
    req: Request,
    { params }: { params: { storeId: string; saloonId: string } }
) {
    try {
        if (!params.saloonId) {
            return new NextResponse("Saloon ID is required", { status: 400 });
        }

        const saloon = await prismadb.saloon.findUnique({
            where: {
                id: params.saloonId,
            },
            include: {
                saloonServices: {
                    include: {
                        service: {
                            include: {
                                category: true,
                                parentService: true,
                            }
                        }
                    }
                }
            }
        });

        if (!saloon) {
            return new NextResponse("Saloon not found", { status: 404 });
        }

        return NextResponse.json(saloon);
    } catch (error) {
        console.log("[SALOON_PRICING_GET]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";
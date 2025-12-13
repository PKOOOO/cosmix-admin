import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { checkAdminAccess } from "@/lib/admin-access";

export async function POST(
    req: NextRequest,
    { params }: { params: { saloonId: string } }
) {
    try {
        const { user } = await checkAdminAccess();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { serviceId, price, durationMinutes, isAvailable, availableDays } = body;

        if (!serviceId || price === undefined || !durationMinutes) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        // Verify saloon ownership
        const saloon = await prismadb.saloon.findFirst({
            where: {
                id: params.saloonId,
                userId: user.id
            }
        });

        if (!saloon) {
            return new NextResponse("Saloon not found", { status: 404 });
        }

        // Check if service already exists for this saloon
        const existingService = await prismadb.saloonService.findUnique({
            where: {
                saloonId_serviceId: {
                    saloonId: params.saloonId,
                    serviceId: serviceId
                }
            }
        });

        if (existingService) {
            return new NextResponse("Service already exists for this saloon", { status: 400 });
        }

        // Create saloon service
        const saloonService = await prismadb.saloonService.create({
            data: {
                saloonId: params.saloonId,
                serviceId,
                price,
                durationMinutes,
                isAvailable: isAvailable ?? true,
                availableDays: availableDays ?? [1, 2, 3, 4, 5] // Default to weekdays
            }
        });

        return NextResponse.json(saloonService);

    } catch (error) {
        console.error("[SALOON_SERVICE_POST]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export async function GET(
    req: NextRequest,
    { params }: { params: { saloonId: string } }
) {
    try {
        const { user } = await checkAdminAccess();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Verify saloon ownership
        const saloon = await prismadb.saloon.findFirst({
            where: {
                id: params.saloonId,
                userId: user.id
            }
        });

        if (!saloon) {
            return new NextResponse("Saloon not found", { status: 404 });
        }

        // Get all services for this saloon
        const saloonServices = await prismadb.saloonService.findMany({
            where: {
                saloonId: params.saloonId
            },
            include: {
                service: {
                    include: {
                        category: true
                    }
                }
            }
        });

        return NextResponse.json(saloonServices);

    } catch (error) {
        console.error("[SALOON_SERVICE_GET]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

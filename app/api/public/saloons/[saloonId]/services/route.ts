// app/api/public/saloons/[saloonId]/services/route.ts
import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function GET(
    req: NextRequest,
    { params }: { params: { saloonId: string } }
) {
    try {
        const { saloonId } = params;

        // Get all services for this saloon
        const saloonServices = await prismadb.saloonService.findMany({
            where: {
                saloonId: saloonId,
                isAvailable: true // Only return available services
            },
            include: {
                service: {
                    include: {
                        category: true,
                        parentService: true
                    }
                }
            }
        });

        // Transform the data to match the Service interface
        const services = saloonServices.map(saloonService => ({
            id: saloonService.service.id,
            name: saloonService.service.name,
            description: saloonService.service.description,
            categoryId: saloonService.service.categoryId,
            parentServiceId: saloonService.service.parentServiceId,
            isPopular: saloonService.service.isPopular,
            createdAt: saloonService.service.createdAt,
            updatedAt: saloonService.service.updatedAt,
            category: saloonService.service.category,
            parentService: saloonService.service.parentService,
            // Include pricing info from saloon service
            price: saloonService.price,
            durationMinutes: saloonService.durationMinutes,
            isAvailable: saloonService.isAvailable,
            availableDays: saloonService.availableDays
        }));

        return NextResponse.json(services);

    } catch (error) {
        console.error("[PUBLIC_SALOON_SERVICES_GET]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";

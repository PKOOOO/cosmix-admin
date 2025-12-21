import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { requireAdmin } from "@/lib/admin-access";

export async function PATCH(
    req: Request,
    { params }: { params: { serviceId: string } }
) {
    try {
        await requireAdmin();
        const body = await req.json();
        const { name, description, workTypes } = body;

        console.log('[ADMIN_SERVICE_PATCH] Request body:', { name, description, workTypes, serviceId: params.serviceId });

        if (!name) {
            return new NextResponse("Name is required", { status: 400 });
        }

        // Check if the service exists (both parent and sub-services)
        const existingService = await prismadb.service.findUnique({
            where: {
                id: params.serviceId
            }
        });

        if (!existingService) {
            return new NextResponse("Service not found", { status: 404 });
        }

        // Check for duplicate names based on service type
        let duplicateService;

        if (existingService.parentServiceId) {
            // This is a sub-service - check for duplicates under the same parent
            duplicateService = await prismadb.service.findFirst({
                where: {
                    name: name,
                    parentServiceId: existingService.parentServiceId,
                    id: { not: params.serviceId }
                }
            });

            if (duplicateService) {
                return new NextResponse("Sub-service with this name already exists under this parent service", { status: 409 });
            }
        } else {
            // This is a parent service - check for duplicates in the same category
            duplicateService = await prismadb.service.findFirst({
                where: {
                    name: name,
                    categoryId: existingService.categoryId,
                    parentServiceId: null,
                    id: { not: params.serviceId }
                }
            });

            if (duplicateService) {
                return new NextResponse("Parent service with this name already exists in this category", { status: 409 });
            }
        }

        // Build update data
        const updateData: any = { name };
        if (description !== undefined) {
            updateData.description = description;
        }
        if (workTypes !== undefined) {
            const validWorkTypes = ["UUDET", "POISTO", "HUOLTO", "EI_LISAKKEITA", "LYHYET", "KESKIPITKAT", "PITKAT"] as const;
            if (!Array.isArray(workTypes) || !workTypes.every((w) => validWorkTypes.includes(w))) {
                return new NextResponse("workTypes must be an array of UUDET, POISTO, HUOLTO, EI_LISAKKEITA, LYHYET, KESKIPITKAT, PITKAT", { status: 400 });
            }
            updateData.workTypes = workTypes;
        }

        console.log('[ADMIN_SERVICE_PATCH] Update data:', updateData);

        const service = await prismadb.service.update({
            where: {
                id: params.serviceId
            },
            data: updateData
        });

        console.log('[ADMIN_SERVICE_PATCH] Updated service:', { id: service.id, name: service.name, description: service.description, workTypes: (service as any).workTypes });

        return NextResponse.json(service);

    } catch (error) {
        console.log('[ADMIN_SERVICE_PATCH]', error);
        if (error instanceof Error && error.message === "Admin access required") {
            return new NextResponse("Admin access required", { status: 403 });
        }
        return new NextResponse("Internal error", { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { serviceId: string } }
) {
    try {
        await requireAdmin();

        // Check if the service exists (both parent and sub-services)
        const existingService = await prismadb.service.findUnique({
            where: {
                id: params.serviceId
            }
        });

        if (!existingService) {
            return new NextResponse("Service not found", { status: 404 });
        }

        // If it's a parent service, check if it has sub-services
        if (!existingService.parentServiceId) {
            const subServicesCount = await prismadb.service.count({
                where: {
                    parentServiceId: params.serviceId
                }
            });

            if (subServicesCount > 0) {
                return new NextResponse("Cannot delete parent service with existing sub-services", { status: 400 });
            }
        }

        // Check if service is used in any saloon services
        const saloonServicesCount = await prismadb.saloonService.count({
            where: {
                serviceId: params.serviceId
            }
        });

        if (saloonServicesCount > 0) {
            return new NextResponse("Cannot delete service that is being used by saloons", { status: 400 });
        }

        // Delete the service
        await prismadb.service.delete({
            where: {
                id: params.serviceId
            }
        });

        return new NextResponse(null, { status: 204 });

    } catch (error) {
        console.log('[ADMIN_SERVICE_DELETE]', error);
        if (error instanceof Error && error.message === "Admin access required") {
            return new NextResponse("Admin access required", { status: 403 });
        }
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";

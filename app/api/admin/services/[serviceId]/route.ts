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
        const { name } = body;

        if (!name) {
            return new NextResponse("Name is required", { status: 400 });
        }

        // Check if the service exists and is a parent service
        const existingService = await prismadb.service.findFirst({
            where: {
                id: params.serviceId,
                parentServiceId: null // Parent services have no parent
            }
        });

        if (!existingService) {
            return new NextResponse("Parent service not found", { status: 404 });
        }

        // Check if another parent service with the same name exists in the same category
        const duplicateService = await prismadb.service.findFirst({
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

        // Update the service
        const service = await prismadb.service.update({
            where: {
                id: params.serviceId
            },
            data: {
                name
            }
        });

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

        // Check if the service exists and is a parent service
        const existingService = await prismadb.service.findFirst({
            where: {
                id: params.serviceId,
                parentServiceId: null
            }
        });

        if (!existingService) {
            return new NextResponse("Parent service not found", { status: 404 });
        }

        // Check if service has sub-services
        const subServicesCount = await prismadb.service.count({
            where: {
                parentServiceId: params.serviceId
            }
        });

        if (subServicesCount > 0) {
            return new NextResponse("Cannot delete parent service with existing sub-services", { status: 400 });
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

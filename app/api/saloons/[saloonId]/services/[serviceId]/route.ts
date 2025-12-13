import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { checkAdminAccess } from "@/lib/admin-access";

export async function PATCH(
    req: NextRequest,
    { params }: { params: { saloonId: string; serviceId: string } }
) {
    try {
        const { user } = await checkAdminAccess();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { price, durationMinutes, isAvailable, availableDays } = body;

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

        // Update saloon service
        const saloonService = await prismadb.saloonService.update({
            where: {
                saloonId_serviceId: {
                    saloonId: params.saloonId,
                    serviceId: params.serviceId
                }
            },
            data: {
                ...(price !== undefined && { price }),
                ...(durationMinutes !== undefined && { durationMinutes }),
                ...(isAvailable !== undefined && { isAvailable }),
                ...(availableDays !== undefined && { availableDays })
            }
        });

        return NextResponse.json(saloonService);

    } catch (error) {
        console.error("[SALOON_SERVICE_PATCH]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { saloonId: string; serviceId: string } }
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

        // Delete saloon service
        await prismadb.saloonService.delete({
            where: {
                saloonId_serviceId: {
                    saloonId: params.saloonId,
                    serviceId: params.serviceId
                }
            }
        });

        return new NextResponse(null, { status: 204 });

    } catch (error) {
        console.error("[SALOON_SERVICE_DELETE]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

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

        const { name, description, categoryId, price, durationMinutes, isPopular, parentServiceId } = body;

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
                price,
                durationMinutes,
                isPopular,
                parentServiceId,
            },
        });

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
// app/api/services/[serviceId]/route.ts
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
                parentService: true,
                subServices: true,
                saloonServices: {
                    include: {
                        saloon: {
                            select: {
                                id: true,
                                name: true,
                                images: true,
                            }
                        }
                    }
                }
            }
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
    { params }: { params: { serviceId: string } }
) {
    try {
        const { userId } = auth();
        const body = await req.json();

        const { name, description, categoryId, parentServiceId } = body;

        if (!userId) {
            return new NextResponse("Unauthenticated", { status: 401 });
        }

        if (!name) {
            return new NextResponse("Name is required", { status: 400 });
        }

        if (!params.serviceId) {
            return new NextResponse("Service ID is required", { status: 400 });
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

        // Check if the user has access to this service through their saloons
        const userServiceAccess = await prismadb.saloonService.findFirst({
            where: {
                serviceId: params.serviceId,
                saloon: {
                    userId: user.id
                }
            }
        });

        if (!userServiceAccess) {
            return new NextResponse("Unauthorized", { status: 403 });
        }

        // Update the service
        const service = await prismadb.service.update({
            where: {
                id: params.serviceId,
            },
            data: {
                name,
                description,
                categoryId,
                parentServiceId,
            },
        });

        return NextResponse.json(service);
    } catch (error) {
        console.log('[SERVICE_PATCH]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { serviceId: string } }
) {
    try {
        const { userId } = auth();

        if (!userId) {
            return new NextResponse("Unauthenticated", { status: 401 });
        }

        if (!params.serviceId) {
            return new NextResponse("Service ID is required", { status: 400 });
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

        // Check if the user has access to this service through their saloons
        const userServiceAccess = await prismadb.saloonService.findFirst({
            where: {
                serviceId: params.serviceId,
                saloon: {
                    userId: user.id
                }
            }
        });

        if (!userServiceAccess) {
            return new NextResponse("Unauthorized", { status: 403 });
        }

        // First delete all saloon_services that reference this service
        await prismadb.saloonService.deleteMany({
            where: {
                serviceId: params.serviceId,
            },
        });

        // Then delete the service
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
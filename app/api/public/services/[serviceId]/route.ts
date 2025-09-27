// app/api/public/services/[serviceId]/route.ts
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function GET(
    req: Request,
    { params }: { params: { serviceId: string } }
) {
    try {
        const { serviceId } = params;

        if (!serviceId) {
            return new NextResponse("Service ID is required", { status: 400 });
        }

        // Get service with saloon services
        const service = await prismadb.service.findUnique({
            where: {
                id: serviceId
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
                saloonServices: {
                    include: {
                        saloon: {
                            include: {
                                images: {
                                    select: {
                                        id: true,
                                        url: true,
                                    }
                                }
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
        console.log('[PUBLIC_SERVICE_GET]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";

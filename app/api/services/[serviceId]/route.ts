// app/api/services/[serviceId]/route.ts

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
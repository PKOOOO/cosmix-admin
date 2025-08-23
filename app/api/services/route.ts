// app/api/services/route.ts

import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function GET(req: Request) {
    try {
        const services = await prismadb.service.findMany({
            include: {
                category: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json(services);

    } catch (error) {
        console.log("[SERVICES_GET]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}
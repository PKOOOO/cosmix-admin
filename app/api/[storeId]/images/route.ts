// app/api/[storeId]/images/route.ts

import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function POST(
    req: Request,
    { params }: { params: { storeId: string } }
) {
    try {
        const { userId } = auth();
        const body = await req.json();

        const { url } = body;

        if (!userId) {
            return new NextResponse("Unauthenticated", { status: 401 });
        }
        if (!url) {
            return new NextResponse("Image URL is required", { status: 400 });
        }
        if (!params.storeId) {
            return new NextResponse("Store ID is required", { status: 400 });
        }

        const storeByUserId = await prismadb.store.findFirst({
            where: {
                id: params.storeId,
                userId,
            },
        });

        if (!storeByUserId) {
            return new NextResponse("Unauthorized", { status: 403 });
        }

        const image = await prismadb.image.create({
            data: {
                url,
                storeId: params.storeId,
            },
        });

        return NextResponse.json(image);
        
    } catch (error) {
        console.log("[IMAGES_POST]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";
// app/api/[storeId]/images/[imageId]/route.ts

import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function DELETE(
    req: Request,
    { params }: { params: { storeId: string, imageId: string } }
) {
    try {
        const { userId } = auth();

        if (!userId) {
            return new NextResponse("Unauthenticated", { status: 401 });
        }

        if (!params.storeId || !params.imageId) {
            return new NextResponse("Store ID and Image ID are required", { status: 400 });
        }

        const storeByUserId = await prismadb.store.findFirst({
            where: {
                id: params.storeId,
                userId
            },
        });

        if (!storeByUserId) {
            return new NextResponse("Unauthorized", { status: 403 });
        }

        const image = await prismadb.image.delete({
            where: {
                id: params.imageId,
            },
        });

        return NextResponse.json(image);
        
    } catch (error) {
        console.log("[IMAGE_DELETE]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";
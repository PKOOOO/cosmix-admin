// app/api/[storeId]/saloons/[saloonId]/route.ts
import prismadb from "@/lib/prismadb";
import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    { params }: { params: { storeId: string; saloonId: string } }
) {
    try {
        if (!params.saloonId) {
            return new NextResponse("Saloon ID is required", { status: 400 });
        }

        // Enforce that the requesting user owns this saloon within the store
        const { userId: clerkUserId } = auth();
        if (!clerkUserId) {
            return new NextResponse("Unauthenticated", { status: 401 });
        }
        const user = await prismadb.user.findUnique({ where: { clerkId: clerkUserId } });
        if (!user) {
            return new NextResponse("User not found", { status: 401 });
        }

        const saloon = await prismadb.saloon.findFirst({
            where: {
                id: params.saloonId,
                storeId: params.storeId,
                userId: user.id,
            },
            include: {
                images: true,
                saloonServices: {
                    include: {
                        service: true
                    }
                }
            }
        });

        return NextResponse.json(saloon);
    } catch (error) {
        console.log("[SALOON_GET]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: { storeId: string; saloonId: string } }
) {
    try {
        const { userId } = auth();
        const body = await req.json();

        const { name, description, shortIntro, address, images } = body;

        if (!userId) {
            return new NextResponse("Unauthenticated", { status: 401 });
        }
        if (!name) {
            return new NextResponse("Name is required", { status: 400 });
        }
        if (!images || !images.length) {
            return new NextResponse("Images are required", { status: 400 });
        }
        if (!params.saloonId) {
            return new NextResponse("Saloon ID is required", { status: 400 });
        }

        // Find the user record using Clerk ID
        let user = await prismadb.user.findUnique({ where: { clerkId: userId } });
        if (!user) {
            return new NextResponse("User not found", { status: 401 });
        }

        if (!user) {
            return new NextResponse("User not found", { status: 401 });
        }

        // Authorization: user must own this saloon
        const saloonOwned = await prismadb.saloon.findFirst({ where: { id: params.saloonId, storeId: params.storeId, userId: user.id } });
        if (!saloonOwned) {
            return new NextResponse("Unauthorized", { status: 403 });
        }

        await prismadb.saloon.update({
            where: {
                id: params.saloonId,
            },
            data: {
                name,
                description,
                shortIntro,
                address,
                images: {
                    deleteMany: {},
                },
            },
        });

        const saloon = await prismadb.saloon.update({
            where: {
                id: params.saloonId,
            },
            data: {
                images: {
                    createMany: {
                        data: [
                            ...images.map((image: { url: string }) => image),
                        ],
                    },
                },
            },
        });

        return NextResponse.json(saloon);
    } catch (error) {
        console.log("[SALOON_PATCH]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { storeId: string; saloonId: string } }
) {
    try {
        const { userId } = auth();

        if (!userId) {
            return new NextResponse("Unauthenticated", { status: 401 });
        }
        if (!params.saloonId) {
            return new NextResponse("Saloon ID is required", { status: 400 });
        }

        // Find the user record using Clerk ID
        let user = await prismadb.user.findUnique({ where: { clerkId: userId } });
        if (!user) {
            return new NextResponse("User not found", { status: 401 });
        }

        if (!user) {
            return new NextResponse("User not found", { status: 401 });
        }

        // Authorization: user must own this saloon
        const saloonOwned = await prismadb.saloon.findFirst({ where: { id: params.saloonId, storeId: params.storeId, userId: user.id } });
        if (!saloonOwned) {
            return new NextResponse("Unauthorized", { status: 403 });
        }

        const saloon = await prismadb.saloon.delete({
            where: {
                id: params.saloonId,
            },
        });

        return NextResponse.json(saloon);
    } catch (error) {
        console.log("[SALOON_DELETE]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";
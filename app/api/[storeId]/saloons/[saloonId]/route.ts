// app/api/[storeId]/saloons/[saloonId]/route.ts
import prismadb from "@/lib/prismadb";
import { auth, currentUser } from "@clerk/nextjs";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    { params }: { params: { storeId: string; saloonId: string } }
) {
    try {
        if (!params.saloonId) {
            return new NextResponse("Saloon ID is required", { status: 400 });
        }

        // Allow public access to saloon details (for React Native app)
        const saloon = await prismadb.saloon.findFirst({
            where: {
                id: params.saloonId,
                storeId: params.storeId,
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

        if (!saloon) {
            return new NextResponse("Saloon not found", { status: 404 });
        }

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

        // Ensure the Clerk user exists in our DB (create on the fly if missing)
        let user = await prismadb.user.findUnique({ where: { clerkId: userId } });
        if (!user) {
            const cu = await currentUser();
            const email = cu?.emailAddresses?.[0]?.emailAddress;
            if (!email) return new NextResponse("User email missing", { status: 401 });
            user = await prismadb.user.create({
                data: {
                    clerkId: userId,
                    email,
                    name: cu?.firstName || cu?.username || null,
                },
            });
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

        // Ensure the Clerk user exists in our DB (create on the fly if missing)
        let user = await prismadb.user.findUnique({ where: { clerkId: userId } });
        if (!user) {
            const cu = await currentUser();
            const email = cu?.emailAddresses?.[0]?.emailAddress;
            if (!email) return new NextResponse("User email missing", { status: 401 });
            user = await prismadb.user.create({
                data: {
                    clerkId: userId,
                    email,
                    name: cu?.firstName || cu?.username || null,
                },
            });
        }

        // Authorization: user must own this saloon
        const saloonOwned = await prismadb.saloon.findFirst({ where: { id: params.saloonId, storeId: params.storeId, userId: user.id } });
        if (!saloonOwned) {
            return new NextResponse("Unauthorized", { status: 403 });
        }

        // First delete all related data
        await prismadb.saloonService.deleteMany({
            where: {
                saloonId: params.saloonId,
            },
        });

        await prismadb.booking.deleteMany({
            where: {
                saloonId: params.saloonId,
            },
        });

        // Then delete the saloon
        const saloon = await prismadb.saloon.delete({
            where: {
                id: params.saloonId,
            },
        });

        // Check if user has any remaining salons in this store
        const remainingSaloons = await prismadb.saloon.findMany({
            where: {
                storeId: params.storeId,
                userId: user.id,
            },
        });

        return NextResponse.json({
            deletedSaloon: saloon,
            hasRemainingSaloons: remainingSaloons.length > 0,
            remainingCount: remainingSaloons.length
        });
    } catch (error) {
        console.log("[SALOON_DELETE]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";
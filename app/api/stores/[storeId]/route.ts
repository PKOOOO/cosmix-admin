import prismadb from "@/lib/prismadb";
import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    { params }: { params: { storeId: string } }
) {
    try {
        if (!params.storeId) {
            return new NextResponse("Store ID is required", { status: 400 });
        }

        const store = await prismadb.store.findUnique({
            where: {
                id: params.storeId,
            },
            include: {
                images: true,
                storeServices: { // Include services offered by this store
                    include: {
                        service: {
                            include: {
                                category: true, // Include the service's category
                                subServices: true // Include nested services
                            }
                        }
                    }
                }
            }
        });

        if (!store) {
            return new NextResponse("Store not found", { status: 404 });
        }

        return NextResponse.json(store);

    } catch (error) {
        console.log("[STORE_GET]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: { storeId: string } }
) {
    try {
        const { userId } = auth();
        const body = await req.json();

        const { name, description, shortIntro, address } = body;

        if (!userId) {
            return new NextResponse("Unauthenticated", { status: 401 });
        }

        if (!name) {
            return new NextResponse("Name is required", { status: 400 });
        }
        
        if (!params.storeId) {
            return new NextResponse("Store ID is required", { status: 400 });
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

        // Check if the user is the owner of the store using database user ID
        const storeByUserId = await prismadb.store.findFirst({
            where: {
                id: params.storeId,
                userId: user.id, // Use database user ID
            },
        });

        if (!storeByUserId) {
            return new NextResponse("Unauthorized", { status: 403 });
        }

        // Use update instead of updateMany for a single record
        const store = await prismadb.store.update({
            where: {
                id: params.storeId,
            },
            data: {
                name,
                description,
                shortIntro,
                address,
            },
        });

        return NextResponse.json(store);
    } catch (error) {
        console.log('[STORE_PATCH]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { storeId: string } }
) {
    try {
        const { userId } = auth();

        if (!userId) {
            return new NextResponse("Unauthenticated", { status: 401 });
        }

        if (!params.storeId) {
            return new NextResponse("Store ID is required", { status: 400 });
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

        // Check if the user is the owner of the store using database user ID
        const storeByUserId = await prismadb.store.findFirst({
            where: {
                id: params.storeId,
                userId: user.id // Use database user ID
            },
        });

        if (!storeByUserId) {
            return new NextResponse("Unauthorized", { status: 403 });
        }

        // Use delete instead of deleteMany for a single record
        const store = await prismadb.store.delete({
            where: {
                id: params.storeId,
            },
        });

        return NextResponse.json(store);
    } catch (error) {
        console.log("[STORE_DELETE]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";
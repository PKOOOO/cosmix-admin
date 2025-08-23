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
        if (!params.storeId) {
            return new NextResponse("Store ID is required", { status: 400 });
        }

        // First, find the user record using Clerk ID
        const user = await prismadb.user.findUnique({
            where: {
                clerkId: userId
            }
        });

        if (!user) {
            return new NextResponse("User not found", { status: 401 });
        }

        // Check if the authenticated user is the owner of the store using database user ID
        const storeByUserId = await prismadb.store.findFirst({
            where: {
                id: params.storeId,
                userId: user.id, // Use database user ID, not Clerk ID
            },
        });

        if (!storeByUserId) {
            return new NextResponse("Unauthorized", { status: 403 });
        }

        // Create the service first
        const service = await prismadb.service.create({
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

        // Then, link the new service to the store using the join table
        const storeService = await prismadb.storeService.create({
            data: {
                storeId: params.storeId,
                serviceId: service.id,
            },
        });

        return NextResponse.json(service);
        
    } catch (error) {
        console.log("[SERVICE_POST]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}
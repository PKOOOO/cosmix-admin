// app/api/categories/route.ts
import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function POST(req: Request) {
    try {
        const { userId } = auth();
        const body = await req.json();
        const { name } = body;

        if (!userId) {
            return new NextResponse("Unauthenticated", { status: 401 });
        }
        if (!name) {
            return new NextResponse("Name is required", { status: 400 });
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

        // Check if category already exists for this user's saloons
        const existingCategory = await prismadb.category.findFirst({
            where: {
                saloon: {
                    userId: user.id
                },
                name: name
            }
        });

        if (existingCategory) {
            return new NextResponse("Category with this name already exists", { status: 409 });
        }

        // Get the user's first saloon (or you might want to handle multiple saloons differently)
        const userSaloon = await prismadb.saloon.findFirst({
            where: {
                userId: user.id
            }
        });

        if (!userSaloon) {
            return new NextResponse("No saloon found for user", { status: 404 });
        }

        // Creates a new category
        const category = await prismadb.category.create({
            data: {
                name,
                saloonId: userSaloon.id
            }
        });

        return NextResponse.json(category);

    } catch (error) {
        console.log('[CATEGORIES_POST]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

// Getting all categories for the current user's saloons
export async function GET(req: Request) {
    try {
        const { userId } = auth();
        
        if (!userId) {
            return new NextResponse("Unauthenticated", { status: 401 });
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

        // Get categories that are associated with the user's saloons
        const categories = await prismadb.category.findMany({
            where: {
                saloon: {
                    userId: user.id
                }
            },
            orderBy: {
                createdAt: 'desc',
            }
        });

        return NextResponse.json(categories);

    } catch (error) {
        console.log('[CATEGORIES_GET]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";

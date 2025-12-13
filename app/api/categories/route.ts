import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { checkAdminAccess } from "@/lib/admin-access";

export async function POST(req: Request) {
    try {
        const { user, isAdmin } = await checkAdminAccess();
        const body = await req.json();
        const { name, saloonId } = body;

        if (!user) {
            return new NextResponse("Unauthenticated", { status: 401 });
        }
        if (!name) {
            return new NextResponse("Name is required", { status: 400 });
        }

        if (isAdmin) {
            // Admin can create global categories without saloon attachment
            const existingCategory = await prismadb.category.findFirst({
                where: {
                    name: name,
                    isGlobal: true
                }
            });

            if (existingCategory) {
                return new NextResponse("Global category with this name already exists", { status: 409 });
            }

            const category = await prismadb.category.create({
                data: {
                    name,
                    isGlobal: true,
                    saloonId: null
                }
            });

            return NextResponse.json(category);
        } else {
            // Regular users need to specify a saloon and can only create local categories
            if (!saloonId) {
                return new NextResponse("Saloon ID is required for non-admin users", { status: 400 });
            }

            // Verify the saloon belongs to the user
            const userSaloon = await prismadb.saloon.findFirst({
                where: {
                    id: saloonId,
                    userId: user.id
                }
            });

            if (!userSaloon) {
                return new NextResponse("Saloon not found or access denied", { status: 404 });
            }

            // Check if category already exists for this saloon
            const existingCategory = await prismadb.category.findFirst({
                where: {
                    saloonId: saloonId,
                    name: name
                }
            });

            if (existingCategory) {
                return new NextResponse("Category with this name already exists for this saloon", { status: 409 });
            }

            // Create a new local category
            const category = await prismadb.category.create({
                data: {
                    name,
                    saloonId: saloonId,
                    isGlobal: false
                }
            });

            return NextResponse.json(category);
        }

    } catch (error) {
        console.log('[CATEGORIES_POST]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

// Getting all categories (global + user's saloon categories)
export async function GET(req: Request) {
    try {
        const { user } = await checkAdminAccess();

        if (!user) {
            return new NextResponse("Unauthenticated", { status: 401 });
        }

        // Get both global categories and user's saloon categories
        const categories = await prismadb.category.findMany({
            where: {
                OR: [
                    { isGlobal: true }, // Global categories available to all users
                    {
                        saloon: {
                            userId: user.id
                        }
                    } // User's own saloon categories
                ]
            },
            include: {
                saloon: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: [
                { isGlobal: 'desc' }, // Global categories first
                { createdAt: 'desc' }
            ]
        });

        return NextResponse.json(categories);

    } catch (error) {
        console.log('[CATEGORIES_GET]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";

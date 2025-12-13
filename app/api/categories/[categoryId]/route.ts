import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { checkAdminAccess } from "@/lib/admin-access";

export async function GET(
    req: Request,
    { params }: { params: { categoryId: string } }
) {
    try {
        if (!params.categoryId) {
            return new NextResponse("Category ID is required", { status: 400 });
        }

        const category = await prismadb.category.findUnique({
            where: {
                id: params.categoryId,
            },
            include: {
                saloon: {
                    select: {
                        id: true,
                        name: true,
                        images: true,
                    }
                }
            }
        });

        if (!category) {
            return new NextResponse("Category not found", { status: 404 });
        }

        return NextResponse.json(category);
    } catch (error) {
        console.log("[CATEGORY_GET]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: { categoryId: string } }
) {
    try {
        const { user } = await checkAdminAccess();
        const body = await req.json();

        const { name } = body;

        if (!user) {
            return new NextResponse("Unauthenticated", { status: 401 });
        }

        if (!name) {
            return new NextResponse("Name is required", { status: 400 });
        }

        if (!params.categoryId) {
            return new NextResponse("Category ID is required", { status: 400 });
        }

        // Check if the user has access to this category through their saloons
        const userCategoryAccess = await prismadb.category.findFirst({
            where: {
                id: params.categoryId,
                saloon: {
                    userId: user.id
                }
            }
        });

        if (!userCategoryAccess) {
            return new NextResponse("Unauthorized", { status: 403 });
        }

        // Update the category
        const category = await prismadb.category.update({
            where: {
                id: params.categoryId,
            },
            data: {
                name,
            },
        });

        return NextResponse.json(category);
    } catch (error) {
        console.log('[CATEGORY_PATCH]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { categoryId: string } }
) {
    try {
        const { user } = await checkAdminAccess();

        if (!user) {
            return new NextResponse("Unauthenticated", { status: 401 });
        }

        if (!params.categoryId) {
            return new NextResponse("Category ID is required", { status: 400 });
        }

        // Check if the user has access to this category through their saloons
        const userCategoryAccess = await prismadb.category.findFirst({
            where: {
                id: params.categoryId,
                saloon: {
                    userId: user.id
                }
            }
        });

        if (!userCategoryAccess) {
            return new NextResponse("Unauthorized", { status: 403 });
        }

        // Delete the category
        const category = await prismadb.category.delete({
            where: {
                id: params.categoryId,
            },
        });

        return NextResponse.json(category);
    } catch (error) {
        console.log("[CATEGORY_DELETE]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";

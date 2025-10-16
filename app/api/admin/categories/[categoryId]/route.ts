import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { requireAdmin } from "@/lib/admin-access";

export async function PATCH(
    req: Request,
    { params }: { params: { categoryId: string } }
) {
    try {
        await requireAdmin();
        const body = await req.json();
        const { name, popular } = body;

        if (!name) {
            return new NextResponse("Name is required", { status: 400 });
        }

        // Check if the category exists and is global
        const existingCategory = await prismadb.category.findFirst({
            where: {
                id: params.categoryId,
                isGlobal: true
            }
        });

        if (!existingCategory) {
            return new NextResponse("Global category not found", { status: 404 });
        }

        // Check if another global category with the same name exists
        const duplicateCategory = await prismadb.category.findFirst({
            where: {
                name: name,
                isGlobal: true,
                id: { not: params.categoryId }
            }
        });

        if (duplicateCategory) {
            return new NextResponse("Global category with this name already exists", { status: 409 });
        }

        // Update the category
        const category = await prismadb.category.update({
            where: {
                id: params.categoryId
            },
            data: {
                name,
                ...(popular !== undefined ? { popular: !!popular } : {})
            }
        });

        return NextResponse.json(category);

    } catch (error) {
        console.log('[ADMIN_CATEGORY_PATCH]', error);
        if (error instanceof Error && error.message === "Admin access required") {
            return new NextResponse("Admin access required", { status: 403 });
        }
        return new NextResponse("Internal error", { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { categoryId: string } }
) {
    try {
        await requireAdmin();

        // Check if the category exists and is global
        const existingCategory = await prismadb.category.findFirst({
            where: {
                id: params.categoryId,
                isGlobal: true
            }
        });

        if (!existingCategory) {
            return new NextResponse("Global category not found", { status: 404 });
        }

        // Check if category has services
        const servicesCount = await prismadb.service.count({
            where: {
                categoryId: params.categoryId
            }
        });

        if (servicesCount > 0) {
            return new NextResponse("Cannot delete category with existing services", { status: 400 });
        }

        // Delete the category
        await prismadb.category.delete({
            where: {
                id: params.categoryId
            }
        });

        return new NextResponse(null, { status: 204 });

    } catch (error) {
        console.log('[ADMIN_CATEGORY_DELETE]', error);
        if (error instanceof Error && error.message === "Admin access required") {
            return new NextResponse("Admin access required", { status: 403 });
        }
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";

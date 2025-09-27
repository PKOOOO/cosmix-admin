// app/(dashboard)/categories/[categoryId]/page.tsx
import prismadb from "@/lib/prismadb";
import { CategoryForm } from "./components/category-form";
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";

const CategoryPage = async ({
    params,
}: {
    params: { categoryId: string };
}) => {
    const { userId } = auth();
    
    if (!userId) {
        redirect('/');
    }

    // Find the user in your database using the Clerk ID
    const user = await prismadb.user.findUnique({
        where: { 
            clerkId: userId 
        }
    });

    if (!user) {
        redirect('/');
    }

    const category = await prismadb.category.findUnique({
        where: {
            id: params.categoryId,
        },
        include: {
            saloon: {
                select: {
                    id: true,
                    userId: true,
                    name: true,
                }
            }
        },
    });

    if (!category) {
        redirect('/dashboard/categories');
    }

    // Check if user has access to this category through their saloons
    if (category.saloon.userId !== user.id) {
        redirect('/dashboard/categories');
    }

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6 ">
                <CategoryForm initialData={category} />
            </div>
        </div>
    );
};

export default CategoryPage;

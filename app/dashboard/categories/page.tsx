// app/(dashboard)/dashboard/categories/page.tsx
export const dynamic = 'force-dynamic';

import prismadb from "@/lib/prismadb";
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { CategoryClient } from "./components/client";
import { CategoryColumn } from "./components/columns";

const CategoriesPage = async () => {
    const { userId: clerkUserId } = auth();
    
    if (!clerkUserId) {
        redirect('/');
    }

    // Find the user in your database using the Clerk ID
    const user = await prismadb.user.findUnique({
        where: { 
            clerkId: clerkUserId 
        }
    });

    if (!user) {
        redirect('/');
    }

    // Check if user has any saloons
    const userSaloons = await prismadb.saloon.findMany({
        where: {
            userId: user.id
        }
    });

    if (userSaloons.length === 0) {
        redirect('/dashboard/saloons');
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
            },
            services: {
                select: {
                    id: true
                }
            }
        },
        orderBy: [
            { isGlobal: 'desc' }, // Global categories first
            { createdAt: 'desc' }
        ],
    });

    const formattedCategories: CategoryColumn[] = categories.map((item) => ({
        id: item.id,
        name: item.name,
        saloonName: item.saloon?.name,
        isGlobal: item.isGlobal,
        servicesCount: item.services.length,
        createdAt: new Date(item.createdAt).toLocaleDateString()
    }));

    return ( 
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
                <CategoryClient data={formattedCategories} />
            </div>
        </div>
    );
}

export default CategoriesPage;

// app/(dashboard)/dashboard/services/page.tsx
export const dynamic = 'force-dynamic';

import prismadb from "@/lib/prismadb";
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { ServiceClient } from "./components/client";
import { ServiceColumn } from "./components/columns";
import { checkAdminAccess } from "@/lib/admin-access";

const ServicesPage = async () => {
    const { user } = await checkAdminAccess();

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

    // Get all services for the user's categories and global categories
    const services = await prismadb.service.findMany({
        where: {
            category: {
                OR: [
                    { isGlobal: true }, // Global categories available to all users
                    {
                        saloon: {
                            userId: user.id
                        }
                    } // User's own saloon categories
                ]
            }
        },
        include: {
            category: true,
            parentService: true,
            subServices: true,
            saloonServices: {
                where: {
                    saloon: {
                        userId: user.id
                    }
                },
                include: {
                    saloon: {
                        select: {
                            id: true,
                            name: true,
                        }
                    }
                }
            }
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    const formattedServices: ServiceColumn[] = services.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description || "",
        category: item.category?.name || "",
        createdAt: new Date(item.createdAt).toLocaleDateString(),
        isParent: !item.parentServiceId,
        parentService: item.parentService?.name
    }));


    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
                <ServiceClient data={formattedServices} />
            </div>
        </div>
    );
}

export default ServicesPage;

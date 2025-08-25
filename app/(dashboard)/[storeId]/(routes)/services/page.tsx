// app\(dashboard)\[storeId]\(routes)\services\page.tsx

import prismadb from "@/lib/prismadb";
import { format } from "date-fns";
import { ServiceClient } from "./components/client";
import { ServiceColumn } from "./components/columns";

const ServicesPage = async ({
    params
}: {
    params: { storeId: string }
}) => {
    const services = await prismadb.storeService.findMany({
        where: {
            storeId: params.storeId,
        },
        include: {
            service: {
                include: {
                    category: true,
                },
            },
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    const formattedServices: ServiceColumn[] = services.map((item) => ({
        id: item.service.id,
        name: item.service.name,
        // price: item.service.price ?? null,
        // durationMinutes: item.service.durationMinutes ?? null,
        isPopular: item.service.isPopular,
        categoryName: item.service.category?.name ?? "No category",
        createdAt: format(item.createdAt, "MMMM do, yyyy")
    }));

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <ServiceClient data={formattedServices} />
            </div>
        </div>
    );
}

export default ServicesPage;
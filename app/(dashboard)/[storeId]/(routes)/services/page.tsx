// app\(dashboard)\[storeId]\(routes)\services\page.tsx

import prismadb from "@/lib/prismadb";
import { format } from "date-fns";
import { ServiceClient } from "./components/client";
import { ServiceColumn } from "./components/columns";
import { getOwnedSelectedSaloonId } from "@/lib/saloon";

const ServicesPage = async ({
    params
}: {
    params: { storeId: string }
}) => {
    const selectedSaloonId = await getOwnedSelectedSaloonId(params.storeId);
    const services = await prismadb.storeService.findMany({
        where: {
            storeId: params.storeId,
            ...(selectedSaloonId ? {
                service: {
                    saloonServices: {
                        some: { saloonId: selectedSaloonId }
                    }
                }
            } : {}),
        },
        include: {
            service: {
                include: {
                    category: true,
                    parentService: true, // Include parent service info
                    subServices: true,   // Include sub-services to determine if it's a parent
                    saloonServices: {    // Include saloon relationships
                        include: {
                            saloon: {
                                select: {
                                    id: true,
                                    name: true,
                                }
                            }
                        }
                    },
                },
            },
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    const formattedServices: ServiceColumn[] = services.map((item) => {
        const service = item.service;
        
        // Determine service type
        let serviceType: "Parent" | "Sub-Service" | "Standalone";
        let parentServiceName: string | undefined;

        if (service.parentServiceId && service.parentService) {
            // This is a sub-service
            serviceType = "Sub-Service";
            parentServiceName = service.parentService.name;
        } else if (service.subServices && service.subServices.length > 0) {
            // This is a parent service (has sub-services)
            serviceType = "Parent";
        } else {
            // This is a standalone service
            serviceType = "Standalone";
        }

        return {
            id: service.id,
            name: service.name,
            isPopular: service.isPopular,
            categoryName: service.category?.name ?? "No category",
            serviceType,
            parentServiceName,
            saloonNames: service.saloonServices.map(ss => ss.saloon.name), // Add saloon names
            createdAt: format(item.createdAt, "MMMM do, yyyy")
        };
    });

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-3 sm:p-6 md:p-8 pt-4 sm:pt-6">
                <ServiceClient data={formattedServices} />
            </div>
        </div>
    );
}

export default ServicesPage;
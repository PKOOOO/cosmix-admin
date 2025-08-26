// app\(dashboard)\[storeId]\(routes)\saloons\page.tsx
import prismadb from "@/lib/prismadb";
import { format } from "date-fns";
import { SaloonClient } from "./components/client";
import { SaloonColumn } from "./components/columns";

const SaloonsPage = async ({
    params
}: {
    params: { storeId: string }
}) => {
    const saloons = await prismadb.saloon.findMany({
        where: {
            storeId: params.storeId,
        },
        include: {
            images: true,
            saloonServices: {
                include: {
                    service: {
                        include: {
                            category: true,
                        }
                    }
                }
            }
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    const formattedSaloons: SaloonColumn[] = saloons.map((item) => {
        // Filter only sub-services with pricing information
        const subServices = item.saloonServices
            .filter(saloonService => saloonService.service.parentServiceId !== null)
            .map(saloonService => ({
                name: saloonService.service.name,
                price: saloonService.price,
                duration: saloonService.durationMinutes,
                isAvailable: saloonService.isAvailable,
            }));

        return {
            id: item.id,
            name: item.name,
            shortIntro: item.shortIntro || "",
            address: item.address || "",
            imageUrl: item.images[0]?.url || "",
            subServices: subServices,
            createdAt: format(item.createdAt, "MMMM do, yyyy")
        };
    });

    return ( 
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <SaloonClient data={formattedSaloons} />
            </div>
        </div>
    );
}

export default SaloonsPage;
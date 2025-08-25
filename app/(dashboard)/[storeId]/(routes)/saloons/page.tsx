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
        storeId: params.storeId,  // ✅ correct relation
    },
    include: {
        images: true,
    },
    orderBy: {
        createdAt: 'desc',
    },
});


    const formattedSaloons: SaloonColumn[] = saloons.map((item) => ({
        id: item.id,
        name: item.name,
        shortIntro: item.shortIntro || "",
        address: item.address || "",
        imageUrl: item.images[0]?.url || "",
        createdAt: format(item.createdAt, "MMMM do, yyyy")
    }));

    return ( 
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <SaloonClient data={formattedSaloons} />
            </div>
        </div>
    );
}

export default SaloonsPage;
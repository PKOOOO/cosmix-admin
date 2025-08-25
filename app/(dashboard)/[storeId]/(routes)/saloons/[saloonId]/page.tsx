// app\(dashboard)\[storeId]\(routes)\saloons\[saloonId]\page.tsx
import prismadb from "@/lib/prismadb";
import { SaloonForm } from "./components/saloon-form";

const SaloonPage = async ({
    params,
}: {
    params: { saloonId: string; storeId: string };
}) => {
    const saloon = await prismadb.saloon.findUnique({
        where: {
            id: params.saloonId,
        },
        include: {
            images: true,
        },
    });

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6 ">
                <SaloonForm initialData={saloon} />
            </div>
        </div>
    );
};

export default SaloonPage;
import prismadb from "@/lib/prismadb";
import { ServiceForm } from "../[serviceId]/components/service-form";
import { checkSalonAccess } from "@/lib/salon-access";

const NewServicePage = async ({
    params,
}: {
    params: { storeId: string };
}) => {
    // Check if user has salons, redirect if not
    await checkSalonAccess(params.storeId);

    // Fetch all categories for the category dropdown
    const categories = await prismadb.category.findMany({});

    // Fetch all services for the parent service dropdown
    const services = await prismadb.service.findMany({});

    const saloons = await prismadb.saloon.findMany({
        where: {
            storeId: params.storeId,
        },
    });

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-4 sm:p-6 md:p-8 pt-4 sm:pt-6">
                <ServiceForm
                    initialData={null}
                    categories={categories}
                    services={services}
                    saloons={saloons}
                />
            </div>
        </div>
    );
};

export default NewServicePage;

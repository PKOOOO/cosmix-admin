import prismadb from "@/lib/prismadb";
import { ServiceForm } from "./components/service-form";

const ServicePage = async ({
    params,
}: {
    params: { serviceId: string; storeId: string };
}) => {
    // Fetch the specific service, including its parent, category, and saloon relationships
    const service = await prismadb.service.findUnique({
        where: {
            id: params.serviceId,
        },
        include: {
            parentService: true,
            category: true,
            saloonServices: true, // Include saloon relationships for editing
        },
    });

    // Fetch all categories for the category dropdown
    const categories = await prismadb.category.findMany({});

    // Fetch all services for the parent service dropdown
    // Exclude the current service from this list to prevent circular references
    const services = await prismadb.service.findMany({
        where: {
            id: {
                not: params.serviceId,
            },
        },
    });

    const saloons = await prismadb.saloon.findMany({
        where: {
            storeId: params.storeId,
        },
    });

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-4 sm:p-6 md:p-8 pt-4 sm:pt-6">
                <ServiceForm
                    initialData={service}
                    categories={categories}
                    services={services}
                    saloons={saloons}
                />
            </div>
        </div>
    );
};

export default ServicePage;
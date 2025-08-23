import prismadb from "@/lib/prismadb";
import { ServiceForm } from "./components/service-form";

const ServicePage = async ({
    params,
}: {
    params: { serviceId: string; storeId: string };
}) => {
    // Fetch the specific service, including its parent and category
    const service = await prismadb.service.findUnique({
        where: {
            id: params.serviceId,
        },
        include: {
            parentService: true,
            category: true,
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

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6 ">
                <ServiceForm
                    initialData={service}
                    categories={categories}
                    services={services}
                />
            </div>
        </div>
    );
};

export default ServicePage;
import prismadb from "@/lib/prismadb";

export const getServicesCount = async (storeId: string) => {
    // Count services available at this spa/store
    const servicesCount = await prismadb.storeService.count({
        where: {
            storeId,
        },
    });

    return servicesCount;
}
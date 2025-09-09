import prismadb from "@/lib/prismadb";

export const getServicesCount = async (storeId: string, saloonId?: string) => {
    // Count services available at this spa/store
    const servicesCount = await prismadb.storeService.count({
        where: {
            storeId,
            ...(saloonId ? {
                service: {
                    saloonServices: {
                        some: { saloonId }
                    }
                }
            } : {}),
        },
    });

    return servicesCount;
}
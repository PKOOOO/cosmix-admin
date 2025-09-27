import prismadb from "@/lib/prismadb";

export const getServicesCount = async (userId: string, saloonId?: string) => {
    // Count services available for this user's saloons
    const servicesCount = await prismadb.service.count({
        where: {
            saloonServices: {
                some: {
                    saloon: {
                        userId: userId
                    },
                    ...(saloonId ? { saloonId } : {})
                }
            }
        },
    });

    return servicesCount;
}
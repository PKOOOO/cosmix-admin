import prismadb from "@/lib/prismadb";

export const getSalesCount = async (userId: string, saloonId?: string) => {
    const salesCount = await prismadb.booking.count({
        where: {
            saloon: {
                userId: userId
            },
            status: "confirmed",
            saloonId: saloonId ?? undefined,
        },
    });

    return salesCount;
}

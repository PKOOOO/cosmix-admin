import prismadb from "@/lib/prismadb";

export const getPendingBookings = async (userId: string, saloonId?: string) => {
    const pendingCount = await prismadb.booking.count({
        where: {
            saloon: {
                userId: userId
            },
            status: "pending",
            saloonId: saloonId ?? undefined,
        },
    });

    return pendingCount;
}
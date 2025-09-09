import prismadb from "@/lib/prismadb";

export const getPendingBookings = async (storeId: string, saloonId?: string) => {
    const pendingCount = await prismadb.booking.count({
        where: {
            storeId,
            status: "pending",
            saloonId: saloonId ?? undefined,
        },
    });

    return pendingCount;
}
import prismadb from "@/lib/prismadb";

export const getPendingBookings = async (storeId: string) => {
    const pendingCount = await prismadb.booking.count({
        where: {
            storeId,
            status: "pending", // pending bookings that need attention
        },
    });

    return pendingCount;
}
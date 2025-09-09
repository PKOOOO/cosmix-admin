import prismadb from "@/lib/prismadb";

export const getTotalRevenue = async (storeId: string, saloonId?: string) => {
    const completedBookings = await prismadb.booking.findMany({
        where: {
            storeId,
            status: "completed",
            saloonId: saloonId ?? undefined,
        },
        include: {
            service: true
        }
    });

    const totalRevenue = completedBookings.reduce((total, booking) => {
        return total + (booking.service.price || 0);
    }, 0);

    return totalRevenue;
}
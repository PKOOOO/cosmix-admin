import prismadb from "@/lib/prismadb";

export const getTotalRevenue = async (storeId: string) => {
    const completedBookings = await prismadb.booking.findMany({
        where: {
            storeId,
            status: "completed", // completed/paid bookings
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
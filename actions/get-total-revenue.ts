import prismadb from "@/lib/prismadb";

export const getTotalRevenue = async (storeId: string, saloonId?: string) => {
    const paidBookings = await prismadb.booking.findMany({
        where: {
            storeId,
            status: "confirmed", // Changed from "completed" to "confirmed" to match your system
            saloonId: saloonId ?? undefined,
        },
        include: {
            service: true
        }
    });

    const totalRevenue = paidBookings.reduce((total, booking) => {
        return total + (booking.totalAmount || 0); // Use totalAmount from booking instead of service.price
    }, 0);

    return totalRevenue;
}
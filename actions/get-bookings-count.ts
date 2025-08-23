import prismadb from "@/lib/prismadb";

export const getBookingsCount = async (storeId: string) => {
    const bookingsCount = await prismadb.booking.count({
        where: {
            storeId,
            status: "completed", // count completed bookings
        },
    });

    return bookingsCount;
}
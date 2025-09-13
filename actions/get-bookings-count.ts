import prismadb from "@/lib/prismadb";

export const getBookingsCount = async (storeId: string, saloonId?: string) => {
    const bookingsCount = await prismadb.booking.count({
        where: {
            storeId,
            status: "confirmed", // Changed from "completed" to "confirmed" to match your system
            saloonId: saloonId ?? undefined,
        },
    });

    return bookingsCount;
}
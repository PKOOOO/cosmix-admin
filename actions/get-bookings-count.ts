import prismadb from "@/lib/prismadb";

export const getBookingsCount = async (storeId: string, saloonId?: string) => {
    const bookingsCount = await prismadb.booking.count({
        where: {
            storeId,
            status: "completed",
            saloonId: saloonId ?? undefined,
        },
    });

    return bookingsCount;
}
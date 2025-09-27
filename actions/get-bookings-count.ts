import prismadb from "@/lib/prismadb";

export const getBookingsCount = async (userId: string, saloonId?: string) => {
    const bookingsCount = await prismadb.booking.count({
        where: {
            saloon: {
                userId: userId
            },
            status: "confirmed", // Changed from "completed" to "confirmed" to match your system
            saloonId: saloonId ?? undefined,
        },
    });

    return bookingsCount;
}
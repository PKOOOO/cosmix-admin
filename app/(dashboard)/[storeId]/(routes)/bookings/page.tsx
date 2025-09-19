import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { BookingCalendar } from "./components/calendar";
import { getOwnedSelectedSaloonId } from "@/lib/saloon";
import { checkSalonAccess } from "@/lib/salon-access";

// Updated BookingColumn type with bookingTime field
export type BookingColumn = {
    id: string;
    user: string;
    service: string;
    isConfirmed: boolean;
    date: string;
    time: string;
    createdAt: string;
    totalAmount: number;
    bookingTime: Date; // Added for calendar functionality
};

const BookingsPage = async ({
                                params,
                            }: {
    params: { storeId: string };
}) => {
    // Check if user has salons, redirect if not
    await checkSalonAccess(params.storeId);

    const selectedSaloonId = await getOwnedSelectedSaloonId(params.storeId);
    const bookings = await prismadb.booking.findMany({
        where: {
            storeId: params.storeId,
            saloonId: selectedSaloonId ?? undefined,
        },
        include: {
            user: true, // Includes the user data
            service: {
                include: {
                    category: true, // Includes the service and its category
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    const formattedBookings: BookingColumn[] = bookings.map((item) => {
        return {
            id: item.id,
            // Handle nullable user name with a fallback value, prefer customer name if available
            user: item.customerName || item.user?.name || "Anonymous",
            service: item.service.name,
            // Check the `status` string field to determine if the booking is confirmed.
            isConfirmed: item.status === "confirmed",
            // Use `item.bookingTime` for both date and time formatting.
            date: format(item.bookingTime, "EEEE, MMMM do, yyyy"), // More detailed date format
            time: format(item.bookingTime, "h:mm a"),
            createdAt: format(item.createdAt, "MMM do, yyyy 'at' h:mm a"),
            totalAmount: item.totalAmount || 0,
            // Add the actual booking time for calendar filtering
            bookingTime: item.bookingTime,
        };
    });

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-3 sm:p-6 md:p-8 pt-4 sm:pt-6">
                <BookingCalendar data={formattedBookings} />
            </div>
        </div>
    );
};

export default BookingsPage;
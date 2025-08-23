import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { BookingClient } from "./components/client";
import { BookingColumn } from "./components/columns";

const BookingsPage = async ({
  params,
}: {
  params: { storeId: string };
}) => {
  const bookings = await prismadb.booking.findMany({
    where: {
      storeId: params.storeId,
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
      // Handle nullable user name with a fallback value.
      user: item.user?.name ?? "N/A",
      service: item.service.name,
      // Check the `status` string field to determine if the booking is confirmed.
      isConfirmed: item.status === "confirmed", 
      // Use `item.bookingTime` for both date and time formatting.
      date: format(item.bookingTime, "MMMM do, yyyy"),
      time: format(item.bookingTime, "h:mm a"),
      createdAt: format(item.createdAt, "MMMM do, yyyy"),
    };
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <BookingClient data={formattedBookings} />
      </div>
    </div>
  );
};

export default BookingsPage;
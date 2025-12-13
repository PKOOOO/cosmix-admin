// app/(dashboard)/dashboard/bookings/page.tsx
export const dynamic = 'force-dynamic';

import prismadb from "@/lib/prismadb";
import { BookingClient } from "./components/client";
import { BookingColumn } from "./components/columns";
import { checkAdminAccess } from "@/lib/admin-access";
import { redirect } from "next/navigation";

const BookingsPage = async () => {
    const { user, isAdmin } = await checkAdminAccess();

    if (!user) {
        redirect('/');
    }

    const bookings = await prismadb.booking.findMany({
        where: isAdmin ? {} : {
            saloon: {
                userId: user.id
            }
        },
        include: {
            service: {
                select: {
                    name: true,
                }
            },
            user: {
                select: {
                    name: true,
                    email: true,
                }
            },
            saloon: {
                select: {
                    name: true,
                }
            }
        },
        orderBy: {
            bookingTime: 'desc',
        },
    });

    const formattedBookings: BookingColumn[] = bookings.map((item) => ({
        id: item.id,
        serviceName: item.service.name,
        customerName: item.customerName || item.user.name || "Unknown",
        customerEmail: item.customerEmail || item.user.email || "",
        saloonName: item.saloon.name,
        bookingTime: new Date(item.bookingTime),
        status: item.status,
        totalAmount: item.totalAmount || 0,
        createdAt: new Date(item.createdAt).toLocaleDateString()
    }));

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
                <BookingClient data={formattedBookings} />
            </div>
        </div>
    );
}

export default BookingsPage;

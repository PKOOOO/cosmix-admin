// app/(dashboard)/dashboard/bookings/page.tsx
import prismadb from "@/lib/prismadb";
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { BookingClient } from "./components/client";
import { BookingColumn } from "./components/columns";

const BookingsPage = async () => {
    const { userId: clerkUserId } = auth();
    
    if (!clerkUserId) {
        redirect('/');
    }

    // Find the user in your database using the Clerk ID
    const user = await prismadb.user.findUnique({
        where: { 
            clerkId: clerkUserId 
        }
    });

    if (!user) {
        redirect('/');
    }

    // Check if user has any saloons
    const userSaloons = await prismadb.saloon.findMany({
        where: {
            userId: user.id
        }
    });

    if (userSaloons.length === 0) {
        redirect('/dashboard/saloons');
    }

    // Get all bookings for the user's saloons
    const bookings = await prismadb.booking.findMany({
        where: {
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

// app/(dashboard)/bookings/[bookingId]/page.tsx
import prismadb from "@/lib/prismadb";
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { BookingDetails } from "./components/booking-details";

const BookingPage = async ({
    params,
}: {
    params: { bookingId: string };
}) => {
    const { userId } = auth();
    
    if (!userId) {
        redirect('/');
    }

    // Find the user in your database using the Clerk ID
    const user = await prismadb.user.findUnique({
        where: { 
            clerkId: userId 
        }
    });

    if (!user) {
        redirect('/');
    }

    const booking = await prismadb.booking.findUnique({
        where: {
            id: params.bookingId,
        },
        include: {
            service: {
                include: {
                    category: true,
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
                    address: true,
                    userId: true,
                }
            }
        },
    });

    if (!booking) {
        redirect('/dashboard/bookings');
    }

    // Check if user has access to this booking (either owns the booking or owns the saloon)
    if (booking.userId !== user.id && booking.saloon.userId !== user.id) {
        redirect('/dashboard/bookings');
    }

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6 ">
                <BookingDetails booking={booking} />
            </div>
        </div>
    );
};

export default BookingPage;

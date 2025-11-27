// app/dashboard/bookings/components/client.tsx
"use client";
import { Heading } from "@/components/ui/heading";
import { BookingCalendar } from "./calendar";
import { BookingColumn } from "./columns";

interface BookingClientProps {
    data: BookingColumn[]
}

export const BookingClient: React.FC<BookingClientProps> = ({
    data
}) => {
    return (
        <div className="space-y-4">


            <BookingCalendar data={data} />
        </div>
    )
}

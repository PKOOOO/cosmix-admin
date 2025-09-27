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
            <div className="flex items-center justify-between mt-6 md:mt-8">
                <Heading
                    title={`Bookings (${data.length})`}
                />
            </div>
            
            <BookingCalendar data={data} />
        </div>
    )
}

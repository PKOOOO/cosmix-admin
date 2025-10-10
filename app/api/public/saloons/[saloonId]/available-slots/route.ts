// app/api/public/saloons/[saloonId]/available-slots/route.ts
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function GET(
    req: Request,
    { params }: { params: { saloonId: string } }
) {
    try {
        const { saloonId } = params;
        const { searchParams } = new URL(req.url);
        const serviceId = searchParams.get('serviceId');
        const date = searchParams.get('date');

        if (!saloonId) {
            return new NextResponse("Saloon ID is required", { status: 400 });
        }

        if (!serviceId) {
            return new NextResponse("Service ID is required", { status: 400 });
        }

        if (!date) {
            return new NextResponse("Date is required", { status: 400 });
        }

        // Parse the date
        const requestedDate = new Date(date);
        if (isNaN(requestedDate.getTime())) {
            return new NextResponse("Invalid date format", { status: 400 });
        }

        // Get existing bookings for this saloon, service, and date
        const startOfDay = new Date(requestedDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(requestedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const existingBookings = await prismadb.booking.findMany({
            where: {
                saloonId: saloonId,
                serviceId: serviceId,
                bookingTime: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                status: {
                    not: 'cancelled'
                }
            },
            select: {
                bookingTime: true
            }
        });

        // Get saloon time slot configuration
        let saloonTimeSlots: any[] = [];
        try {
            // Check if the model exists before trying to use it
            if (prismadb.saloonTimeSlot) {
                console.log('Attempting to fetch saloon time slots for saloonId:', saloonId);
                saloonTimeSlots = await prismadb.saloonTimeSlot.findMany({
                    where: {
                        saloonId: saloonId
                    }
                });
                console.log('Fetched saloon time slots:', saloonTimeSlots);
            } else {
                console.log('SaloonTimeSlot model not available, using default time slots');
                saloonTimeSlots = [];
            }
        } catch (error) {
            console.log('Error fetching saloon time slots:', error);
            // Continue with default time slots if there's an error
            saloonTimeSlots = [];
        }

        // Get the service duration from the saloon service
        let serviceDuration = 60; // default 1 hour
        try {
            const saloonService = await prismadb.saloonService.findFirst({
                where: {
                    saloonId: saloonId,
                    serviceId: serviceId
                },
                select: {
                    durationMinutes: true
                }
            });
            
            if (saloonService) {
                serviceDuration = saloonService.durationMinutes;
                console.log('Service duration:', serviceDuration, 'minutes');
            }
        } catch (error) {
            console.log('Error fetching service duration:', error);
        }

        // If no time slots configured, use default (9 AM to 8 PM, 30-minute intervals)
        let availableSlots = [];
        const dayOfWeek = requestedDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        const dayTimeSlot = saloonTimeSlots.find(slot => slot.dayOfWeek === dayOfWeek);
        
        // Check if the saloon is closed on this day
        if (dayTimeSlot && !dayTimeSlot.isOpen) {
            return NextResponse.json({
                availableSlots: [],
                date: date,
                saloonId: saloonId,
                serviceId: serviceId,
                isClosed: true,
                message: "We are closed on this day"
            });
        }
        
        if (dayTimeSlot && dayTimeSlot.isOpen) {
            // Use configured time slots
            const startTime = dayTimeSlot.startTime.split(':');
            const endTime = dayTimeSlot.endTime.split(':');
            const startHour = parseInt(startTime[0]);
            const startMinute = parseInt(startTime[1]);
            const endHour = parseInt(endTime[0]);
            const endMinute = parseInt(endTime[1]);
            // Use service duration instead of slot duration
            let currentHour = startHour;
            let currentMinute = startMinute;
            
            while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
                const slotTime = new Date(requestedDate);
                slotTime.setHours(currentHour, currentMinute, 0, 0);
                
                // Check if this slot is already booked
                const isBooked = existingBookings.some(booking => {
                    const bookingTime = new Date(booking.bookingTime);
                    return bookingTime.getHours() === currentHour && bookingTime.getMinutes() === currentMinute;
                });
                
                // Only add slots that are in the future and not booked
                if (slotTime > new Date() && !isBooked) {
                    availableSlots.push({
                        time: `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`,
                        datetime: slotTime.toISOString()
                    });
                }
                
                // Move to next slot based on service duration
                currentMinute += serviceDuration;
                if (currentMinute >= 60) {
                    currentHour += Math.floor(currentMinute / 60);
                    currentMinute = currentMinute % 60;
                }
            }
        } else {
            // Use default time slots (9 AM to 8 PM) with service duration intervals
            const startHour = 9;
            const endHour = 20;
            let currentHour = startHour;
            let currentMinute = 0;
            
            while (currentHour < endHour) {
                const slotTime = new Date(requestedDate);
                slotTime.setHours(currentHour, currentMinute, 0, 0);
                
                // Check if this slot is already booked
                const isBooked = existingBookings.some(booking => {
                    const bookingTime = new Date(booking.bookingTime);
                    return bookingTime.getHours() === currentHour && bookingTime.getMinutes() === currentMinute;
                });
                
                // Only add slots that are in the future and not booked
                if (slotTime > new Date() && !isBooked) {
                    availableSlots.push({
                        time: `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`,
                        datetime: slotTime.toISOString()
                    });
                }
                
                // Move to next slot based on service duration
                currentMinute += serviceDuration;
                if (currentMinute >= 60) {
                    currentHour += Math.floor(currentMinute / 60);
                    currentMinute = currentMinute % 60;
                }
            }
        }

        return NextResponse.json({
            availableSlots,
            date: date,
            saloonId: saloonId,
            serviceId: serviceId
        });

    } catch (error) {
        console.log('[AVAILABLE_SLOTS_GET]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";

// app/api/[storeId]/saloons/[saloonId]/available-slots/route.ts
import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function GET(
    request: NextRequest,
    { params }: { params: { storeId: string; saloonId: string } }
) {
    try {
        const { searchParams } = new URL(request.url);
        const serviceId = searchParams.get('serviceId');
        const date = searchParams.get('date'); // Format: YYYY-MM-DD

        if (!serviceId) {
            return new NextResponse("Service ID is required", { status: 400 });
        }

        if (!date) {
            return new NextResponse("Date is required", { status: 400 });
        }

        // Parse the requested date
        const requestedDate = new Date(date);
        const dayOfWeek = requestedDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

        // Get the saloon service
        const saloonService = await prismadb.saloonService.findFirst({
            where: {
                saloonId: params.saloonId,
                serviceId: serviceId,
                isAvailable: true,
                availableDays: {
                    has: dayOfWeek // Check if the service is available on this day
                }
            },
            include: {
                service: {
                    include: {
                        category: true,
                        parentService: true,
                    }
                }
            }
        });

        if (!saloonService) {
            return new NextResponse("Service not found or not available on this day", { status: 404 });
        }

        // Get existing bookings for this service on this date
        const existingBookings = await prismadb.booking.findMany({
            where: {
                saloonId: params.saloonId,
                serviceId: serviceId,
                bookingTime: {
                    gte: new Date(requestedDate.getFullYear(), requestedDate.getMonth(), requestedDate.getDate()),
                    lt: new Date(requestedDate.getFullYear(), requestedDate.getMonth(), requestedDate.getDate() + 1),
                },
                status: {
                    in: ['pending', 'confirmed']
                }
            }
        });

        // Generate available time slots (7 AM to 9 PM, 30-minute intervals)
        const availableSlots = [];
        const startHour = 7; // 7 AM
        const endHour = 21; // 9 PM
        const intervalMinutes = 30;
        
        for (let hour = startHour; hour < endHour; hour++) {
            for (let minute = 0; minute < 60; minute += intervalMinutes) {
                const slotDateTime = new Date(requestedDate);
                slotDateTime.setHours(hour, minute, 0, 0);
                
                // Check if this slot is already booked
                const isBooked = existingBookings.some(booking => {
                    const bookingTime = new Date(booking.bookingTime);
                    return bookingTime.getHours() === hour && bookingTime.getMinutes() === minute;
                });
                
                if (!isBooked) {
                    availableSlots.push({
                        time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
                        datetime: slotDateTime.toISOString(),
                        duration: saloonService.durationMinutes,
                        price: saloonService.price,
                    });
                }
            }
        }

        return NextResponse.json({
            service: {
                id: saloonService.service.id,
                name: saloonService.service.name,
                categoryName: saloonService.service.category.name,
                parentServiceName: saloonService.service.parentService?.name,
                duration: saloonService.durationMinutes,
                price: saloonService.price,
            },
            date: date,
            availableSlots: availableSlots,
        });

    } catch (error) {
        console.log("[AVAILABLE_SLOTS_GET]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

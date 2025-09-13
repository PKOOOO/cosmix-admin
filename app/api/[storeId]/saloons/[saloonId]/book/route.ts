// app/api/[storeId]/saloons/[saloonId]/book/route.ts
import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function POST(
    request: NextRequest,
    { params }: { params: { storeId: string; saloonId: string } }
) {
    try {
        const body = await request.json();
        const { 
            serviceId, 
            bookingTime, 
            customerName, 
            customerPhone, 
            customerEmail, 
            notes 
        } = body;

        if (!serviceId) {
            return new NextResponse("Service ID is required", { status: 400 });
        }

        if (!bookingTime) {
            return new NextResponse("Booking time is required", { status: 400 });
        }

        if (!customerName) {
            return new NextResponse("Customer name is required", { status: 400 });
        }

        if (!customerPhone) {
            return new NextResponse("Customer phone is required", { status: 400 });
        }

        // Verify the saloon service exists and is available
        const saloonService = await prismadb.saloonService.findFirst({
            where: {
                saloonId: params.saloonId,
                serviceId: serviceId,
                isAvailable: true,
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
            return new NextResponse("Service not found or not available", { status: 404 });
        }

        // Parse booking time
        const bookingDateTime = new Date(bookingTime);
        const dayOfWeek = bookingDateTime.getDay();
        const hour = bookingDateTime.getHours();
        const minute = bookingDateTime.getMinutes();

        // Check if the booking time is within the allowed range (7 AM to 9 PM)
        if (hour < 7 || hour >= 21) {
            return new NextResponse("Booking time must be between 7:00 AM and 9:00 PM", { status: 400 });
        }

        // Check if the booking time is on a 30-minute interval
        if (minute !== 0 && minute !== 30) {
            return new NextResponse("Booking time must be on a 30-minute interval", { status: 400 });
        }

        // Check if the service is available on this day
        if (!saloonService.availableDays.includes(dayOfWeek)) {
            return new NextResponse("Service is not available on this day", { status: 400 });
        }

        // Check if the slot is already booked
        const existingBooking = await prismadb.booking.findFirst({
            where: {
                saloonId: params.saloonId,
                serviceId: serviceId,
                bookingTime: bookingDateTime,
                status: {
                    in: ['pending', 'confirmed']
                }
            }
        });

        if (existingBooking) {
            return new NextResponse("This time slot is already booked", { status: 409 });
        }

        // Create the booking
        const booking = await prismadb.booking.create({
            data: {
                userId: "anonymous", // For now, we'll use anonymous bookings
                serviceId: serviceId,
                storeId: params.storeId,
                saloonId: params.saloonId,
                bookingTime: bookingDateTime,
                status: "pending",
                customerName: customerName,
                customerPhone: customerPhone,
                customerEmail: customerEmail,
                notes: notes,
                totalAmount: saloonService.price,
            },
            include: {
                service: {
                    include: {
                        category: true,
                        parentService: true,
                    }
                },
                saloon: true,
            }
        });

        return NextResponse.json({
            booking: booking,
            message: "Booking created successfully"
        });

    } catch (error) {
        console.log("[BOOKING_POST]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

// GET method to fetch booking details
export async function GET(
    request: NextRequest,
    { params }: { params: { storeId: string; saloonId: string } }
) {
    try {
        const { searchParams } = new URL(request.url);
        const bookingId = searchParams.get('bookingId');

        if (!bookingId) {
            return new NextResponse("Booking ID is required", { status: 400 });
        }

        const booking = await prismadb.booking.findFirst({
            where: {
                id: bookingId,
                saloonId: params.saloonId,
                storeId: params.storeId,
            },
            include: {
                service: {
                    include: {
                        category: true,
                        parentService: true,
                    }
                },
                saloon: true,
            }
        });

        if (!booking) {
            return new NextResponse("Booking not found", { status: 404 });
        }

        return NextResponse.json(booking);

    } catch (error) {
        console.log("[BOOKING_GET]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

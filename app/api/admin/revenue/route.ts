import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { requireAdmin } from "@/lib/admin-access";

export async function GET() {
    try {
        await requireAdmin();

        // Get all saloons with their booking revenue
        const saloons = await prismadb.saloon.findMany({
            select: {
                id: true,
                name: true,
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                },
                bookings: {
                    select: {
                        id: true,
                        totalAmount: true,
                        status: true,
                        bookingTime: true,
                        customerName: true,
                        service: {
                            select: {
                                name: true
                            }
                        },
                        user: {
                            select: {
                                name: true,
                                email: true
                            }
                        }
                    },
                    orderBy: {
                        bookingTime: 'desc'
                    }
                },
                _count: {
                    select: {
                        bookings: true
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });

        // Calculate revenue per saloon
        const saloonsWithRevenue = saloons.map(saloon => {
            const totalRevenue = saloon.bookings.reduce((sum, booking) => {
                return sum + (booking.totalAmount || 0);
            }, 0);

            return {
                id: saloon.id,
                name: saloon.name,
                ownerName: saloon.user?.name || 'Unknown',
                ownerEmail: saloon.user?.email || '',
                totalRevenue,
                bookingsCount: saloon._count.bookings,
                bookings: saloon.bookings
            };
        });

        // Sort by revenue (highest first)
        saloonsWithRevenue.sort((a, b) => b.totalRevenue - a.totalRevenue);

        // Calculate grand total
        const grandTotal = saloonsWithRevenue.reduce((sum, s) => sum + s.totalRevenue, 0);

        return NextResponse.json({
            grandTotal,
            saloons: saloonsWithRevenue
        });

    } catch (error) {
        console.log('[ADMIN_REVENUE_GET]', error);
        if (error instanceof Error && error.message === "Admin access required") {
            return new NextResponse("Admin access required", { status: 403 });
        }
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";

// app\api\[storeId]\bookings\route.ts
import { auth } from "@clerk/nextjs";
import { verifyToken } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(
    req: Request,
    { params }: { params: { storeId: string } }
) {
    try {
        const { userId } = auth();
        const body = await req.json();

        const { serviceId, bookingTime } = body;

        if (!userId) {
            return new NextResponse("Unauthenticated", { status: 401 });
        }
        if (!serviceId || !bookingTime) {
            return new NextResponse("Service ID and booking time are required", { status: 400 });
        }
        if (!params.storeId) {
            return new NextResponse("Store ID is required", { status: 400 });
        }

        // Find the user record using Clerk ID
        const user = await prismadb.user.findUnique({
            where: {
                clerkId: userId
            }
        });

        if (!user) {
            return new NextResponse("User not found", { status: 401 });
        }

        const booking = await prismadb.booking.create({
            data: {
                userId: user.id, // Use database user ID
                serviceId,
                storeId: params.storeId,
                bookingTime,
            },
        });

        return NextResponse.json(booking);

    } catch (error) {
        console.log("[BOOKING_POST]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export async function GET(
    req: Request,
    { params }: { params: { storeId: string } }
) {
    try {
        // Get the authorization header
        const authHeader = req.headers.get("Authorization");
        let userId = null;
        
        // Try to get user from Clerk auth first
        try {
            const { userId: clerkUserId } = auth();
            userId = clerkUserId;
            console.log("Bookings API - Clerk auth success, userId:", userId);
            
            // If Clerk auth succeeds but userId is null, try JWT token verification
            if (!userId && authHeader && authHeader.startsWith("Bearer ")) {
                console.log("Bookings API - Clerk auth succeeded but userId is null, trying JWT verification");
                try {
                    const token = authHeader.substring(7);
                    console.log("Bookings API - Attempting JWT verification with token:", token.substring(0, 20) + "...");
                    const payload = await verifyToken(token, {
                        secretKey: process.env.CLERK_SECRET_KEY,
                        issuer: (iss) => iss.startsWith('https://clerk.') || iss.includes('clerk.accounts.dev')
                    });
                    userId = payload.sub;
                    console.log("Bookings API - JWT verification success, userId:", userId);
                } catch (error) {
                    console.log("Bookings API - JWT verification failed:", error);
                }
            }
        } catch (error) {
            console.log("Bookings API - Clerk auth failed:", error);
            // If Clerk auth fails, try JWT token verification
            if (authHeader && authHeader.startsWith("Bearer ")) {
                try {
                    const token = authHeader.substring(7);
                    console.log("Bookings API - Attempting JWT verification with token:", token.substring(0, 20) + "...");
                    const payload = await verifyToken(token, {
                        secretKey: process.env.CLERK_SECRET_KEY,
                        issuer: (iss) => iss.startsWith('https://clerk.') || iss.includes('clerk.accounts.dev')
                    });
                    userId = payload.sub;
                    console.log("Bookings API - JWT verification success, userId:", userId);
                } catch (error) {
                    console.log("Bookings API - JWT verification failed:", error);
                }
            } else {
                console.log("Bookings API - No Authorization header found");
            }
        }

        if (!params.storeId) {
            return new NextResponse("Store ID is required", { status: 400 });
        }

        console.log("Bookings API - Store ID:", params.storeId);
        console.log("Bookings API - User ID:", userId);
        
        // If we have a userId, check if the user exists in the database
        if (userId) {
            const user = await prismadb.user.findUnique({ where: { clerkId: userId } });
            console.log("Bookings API - User found in database:", user ? "Yes" : "No");
            if (user) {
                console.log("Bookings API - User details:", { id: user.id, clerkId: user.clerkId, email: user.email });
            }
        }

        // If user is authenticated, get their bookings
        if (userId) {
            // Find the user record using Clerk ID
            const user = await prismadb.user.findUnique({
                where: {
                    clerkId: userId
                }
            });

            if (user) {
                console.log("Bookings API - Found user:", user.id);
                
                // Check if user owns the store or get all bookings for the store
                const storeByUserId = await prismadb.store.findFirst({
                    where: {
                        id: params.storeId,
                        userId: user.id,
                    },
                });

                console.log("Bookings API - Store ownership check:", storeByUserId ? "Owner" : "Not owner");

                // If user owns the store, get all bookings
                // If not, get only their own bookings
                const whereClause = storeByUserId 
                    ? { storeId: params.storeId }
                    : { storeId: params.storeId, userId: user.id };

                console.log("Bookings API - Where clause:", whereClause);

                const bookings = await prismadb.booking.findMany({
                    where: whereClause,
                    include: {
                        service: {
                            select: {
                                name: true,
                            },
                        },
                        user: {
                            select: {
                                name: true,
                                email: true,
                            },
                        },
                    },
                    orderBy: {
                        bookingTime: "asc",
                    },
                });

                console.log("Bookings API - Found bookings:", bookings.length);
                return NextResponse.json(bookings, { headers: corsHeaders });
            }
        }

        // If no authentication or user not found, return all bookings for the store
        // This allows users to see all bookings regardless of authentication status
        console.log("Bookings API - No authenticated user, returning all bookings for store");
        
        const allBookings = await prismadb.booking.findMany({
            where: {
                storeId: params.storeId,
            },
            include: {
                service: {
                    select: {
                        name: true,
                    },
                },
                user: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                bookingTime: "asc",
            },
        });

        console.log("Bookings API - Found ALL bookings for store:", allBookings.length);
        console.log("Bookings API - Booking statuses:", allBookings.map(b => ({ id: b.id, status: b.status, userId: b.userId })));
        
        // Let's also check what users these bookings belong to
        const bookingUsers = await prismadb.user.findMany({
            where: {
                id: { in: allBookings.map(b => b.userId) }
            },
            select: {
                id: true,
                clerkId: true,
                email: true,
                name: true
            }
        });
        console.log("Bookings API - Users for these bookings:", bookingUsers);

        // Return all bookings - this will show the user their bookings
        return NextResponse.json(allBookings, { headers: corsHeaders });

    } catch (error) {
        console.log("[STORE_BOOKINGS_GET]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";
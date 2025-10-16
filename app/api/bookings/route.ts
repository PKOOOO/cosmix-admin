// app/api/bookings/route.ts
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

export async function POST(req: Request) {
    try {
        const { userId } = auth();
        const body = await req.json();

        const { serviceId, bookingTime, saloonId } = body;

        if (!userId) {
            return new NextResponse("Unauthenticated", { status: 401 });
        }
        if (!serviceId || !bookingTime || !saloonId) {
            return new NextResponse("Service ID, booking time, and saloon ID are required", { status: 400 });
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

        // Verify the saloon exists
        const saloon = await prismadb.saloon.findUnique({
            where: { id: saloonId }
        });

        if (!saloon) {
            return new NextResponse("Saloon not found", { status: 404 });
        }

        const booking = await prismadb.booking.create({
            data: {
                userId: user.id, // Use database user ID
                serviceId,
                saloonId,
                bookingTime,
                status: 'confirmed',
                paymentMethod: 'pay_at_venue',
            },
        });

        return NextResponse.json(booking);

    } catch (error) {
        console.log("[BOOKING_POST]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        // Get the authorization header
        const authHeader = req.headers.get("Authorization");
        let userId = null;
        const url = new URL(req.url);
        const qpUserId = url.searchParams.get("userId");
        const qpEmail = url.searchParams.get("email");
        
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
                
                // Get bookings for the user's saloons (as owner) or their own bookings
                const bookings = await prismadb.booking.findMany({
                    where: {
                        OR: [
                            // Bookings for services in the user's saloons
                            {
                                saloon: {
                                    userId: user.id
                                }
                            },
                            // User's own bookings
                            {
                                userId: user.id
                            }
                        ]
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
                        saloon: {
                            select: {
                                name: true,
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

        // Fallback: if Clerk auth failed but query contains userId or email, fetch by that
        // This enables mobile clients to retrieve their bookings when token verification fails
        if (!userId && (qpUserId || qpEmail)) {
            console.log("Bookings API - Using query fallback:", { qpUserId, qpEmail });
            const user = await prismadb.user.findFirst({
                where: {
                    OR: [
                        qpUserId ? { clerkId: qpUserId } : undefined,
                        qpEmail ? { email: qpEmail } : undefined,
                    ].filter(Boolean) as any,
                }
            });

            if (user) {
                console.log("Bookings API - Fallback user found:", { id: user.id, clerkId: user.clerkId, email: user.email });
                const bookings = await prismadb.booking.findMany({
                    where: { userId: user.id },
                    include: {
                        service: { select: { name: true } },
                        user: { select: { name: true, email: true } },
                        saloon: { select: { name: true } },
                    },
                    orderBy: { bookingTime: "asc" },
                });
                console.log("Bookings API - Fallback bookings:", bookings.length);
                return NextResponse.json(bookings, { headers: corsHeaders });
            } else {
                console.log("Bookings API - Fallback user not found for provided query params");
            }
        }

        // If no authentication or user not found, return empty array
        console.log("Bookings API - No authenticated user, returning empty array");
        return NextResponse.json([], { headers: corsHeaders });

    } catch (error) {
        console.log("[BOOKINGS_GET]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";

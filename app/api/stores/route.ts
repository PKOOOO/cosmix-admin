// app\api\stores\route.ts
import { auth, clerkClient } from "@clerk/nextjs";
import { NextResponse } from "next/server";

import prismadb from "@/lib/prismadb";

export async function POST(
    req: Request,
) {
    try {
        const { userId } = auth(); // This is the Clerk user ID
        const body = await req.json();

        const { name } = body;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (!name) {
            return new NextResponse("Name is required", { status: 400 });
        }

        // First, find the user in your database using the Clerk ID
        let user = await prismadb.user.findUnique({
            where: { 
                clerkId: userId // Use clerkId field to find the user
            }
        });

        // If user doesn't exist, create them with data from Clerk
        if (!user) {
            try {
                // Get user details from Clerk
                const clerkUser = await clerkClient.users.getUser(userId);
                
                user = await prismadb.user.create({
                    data: {
                        clerkId: userId,
                        email: clerkUser.emailAddresses[0]?.emailAddress || "",
                        name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "Unknown User",
                    }
                });
            } catch (clerkError) {
                console.log('[CLERK_USER_FETCH_ERROR]', clerkError);
                // Fallback: create user with minimal data
                user = await prismadb.user.create({
                    data: {
                        clerkId: userId,
                        email: "",
                        name: "Unknown User",
                    }
                });
            }
        }

        // Now create the store using the database user ID
        const store = await prismadb.store.create({
            data: {
                name,
                userId: user.id // Use the database user ID, not Clerk ID
            }
        });

        return NextResponse.json(store);

    } catch (error) {
        console.log('[STORES_POST]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const stores = await prismadb.store.findMany({
            orderBy: {
                createdAt: 'desc',
            }
        });

        return NextResponse.json(stores);

    } catch (error) {
        console.log('[STORES_GET]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";
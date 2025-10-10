// app/api/public/saloons/route.ts
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

// Public API route for fetching saloons (no authentication required)
export async function GET(req: Request) {
    try {
        // Get all saloons
        const saloons = await prismadb.saloon.findMany({
            include: {
                categories: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
                saloonServices: {
                    include: {
                            service: {
                                select: {
                                    id: true,
                                    name: true,
                                    description: true,
                                }
                            }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc',
            }
        });

        return NextResponse.json(saloons);

    } catch (error) {
        console.log('[PUBLIC_SALOONS_GET]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

// Public API route for creating saloons
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, description, address, phone, email } = body;

        if (!name) {
            return new NextResponse("Name is required", { status: 400 });
        }

        // Create a new saloon
        const saloon = await prismadb.saloon.create({
            data: {
                name,
                description: description || "",
                address: address || "",
                userId: "public-user", // You might want to handle this differently
            },
            include: {
                categories: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            }
        });

        return NextResponse.json(saloon);

    } catch (error) {
        console.log('[PUBLIC_SALOONS_POST]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";

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

export const runtime = "nodejs";

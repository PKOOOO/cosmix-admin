// app/api/public/categories/route.ts
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

// Public API route for fetching categories (no authentication required)
export async function GET(req: Request) {
    try {
        // Get all categories from all saloons
        const categories = await prismadb.category.findMany({
            include: {
                saloon: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
                services: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        isPopular: true,
                        saloonServices: {
                            select: {
                                price: true,
                                durationMinutes: true,
                                isAvailable: true,
                                saloon: {
                                    select: {
                                        id: true,
                                        name: true,
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc',
            }
        });

        return NextResponse.json(categories);

    } catch (error) {
        console.log('[PUBLIC_CATEGORIES_GET]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";

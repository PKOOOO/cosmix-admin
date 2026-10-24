// app/api/public/categories/route.ts
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

// Public API route for fetching categories (no authentication required)
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const popularOnly = searchParams.get('popular') === 'true';
        const globalOnly = searchParams.get('global') === 'true';

        const where: any = {};
        if (popularOnly) where.popular = true;
        if (globalOnly) where.isGlobal = true;

        // Get categories
        const categories = await prismadb.category.findMany({
            where,
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
                        parentServiceId: true,
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

        // Categories change rarely: let Vercel's CDN serve them for a minute and
        // keep serving the cached copy while it refreshes in the background.
        return NextResponse.json(categories, {
            headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
        });

    } catch (error) {
        console.log('[PUBLIC_CATEGORIES_GET]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";

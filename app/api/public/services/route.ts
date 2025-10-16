// app/api/public/services/route.ts
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

// Public API route for fetching services (no authentication required)
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const category = searchParams.get('category');
        const subOnly = searchParams.get('subOnly') === 'true';

        let whereClause: any = {};
        
        if (category) {
            whereClause = {
                category: {
                    name: {
                        contains: category,
                        mode: 'insensitive'
                    }
                }
            };
        }

        // popular removed from services

        if (subOnly) {
            whereClause = {
                ...whereClause,
                parentServiceId: { not: null }
            };
        }

        // Get all services
        const services = await prismadb.service.findMany({
            where: whereClause,
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
                saloonServices: {
                    include: {
                        saloon: {
                            select: {
                                id: true,
                                name: true,
                                address: true,
                                rating: true,
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc',
            }
        });

        return NextResponse.json(services);

    } catch (error) {
        console.log('[PUBLIC_SERVICES_GET]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";

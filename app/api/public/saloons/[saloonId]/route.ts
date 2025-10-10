// app/api/public/saloons/[saloonId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function GET(
    req: NextRequest,
    { params }: { params: { saloonId: string } }
) {
    try {
        const { saloonId } = params;

        // Get the specific saloon
        const saloon = await prismadb.saloon.findUnique({
            where: {
                id: saloonId
            },
            include: {
                images: true,
                saloonServices: {
                    include: {
                        service: {
                            include: {
                                category: true,
                                parentService: true
                            }
                        }
                    }
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                reviews: {
                    select: {
                        rating: true,
                        comment: true,
                        createdAt: true,
                        user: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            }
        });

        if (!saloon) {
            return new NextResponse("Saloon not found", { status: 404 });
        }

        // Calculate average rating
        const avgRating = saloon.reviews.length > 0
            ? saloon.reviews.reduce((sum, review) => sum + review.rating, 0) / saloon.reviews.length
            : 0;

        // Transform the data to include calculated fields
        const saloonWithRating = {
            ...saloon,
            averageRating: avgRating,
            reviewCount: saloon.reviews.length
        };

        return NextResponse.json(saloonWithRating);

    } catch (error) {
        console.error("[PUBLIC_SALOON_GET]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export const runtime = "nodejs";

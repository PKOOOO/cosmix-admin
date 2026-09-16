import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

// Public map data for anonymous browsing. Keep this response limited to fields
// needed by the customer app; in particular, never expose the owner's email.
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const lat = url.searchParams.get("lat");
    const lng = url.searchParams.get("lng");
    const radius = url.searchParams.get("radius") || "10";

    let whereClause: any = {};

    if (lat && lng) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const radiusKm = parseFloat(radius);

      const latRange = radiusKm / 111;
      const lngRange = radiusKm / (111 * Math.cos(latitude * Math.PI / 180));

      whereClause = {
        latitude: {
          gte: latitude - latRange,
          lte: latitude + latRange,
        },
        longitude: {
          gte: longitude - lngRange,
          lte: longitude + lngRange,
        },
      };
    }

    const saloons = await prismadb.saloon.findMany({
      where: whereClause,
      include: {
        images: true,
        saloonServices: {
          include: {
            service: {
              include: {
                category: true,
                parentService: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        reviews: {
          select: {
            rating: true,
            comment: true,
            createdAt: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const saloonsWithRating = saloons.map((saloon) => {
      const averageRating = saloon.reviews.length > 0
        ? saloon.reviews.reduce((sum, review) => sum + review.rating, 0) / saloon.reviews.length
        : 0;

      return {
        ...saloon,
        averageRating,
        reviewCount: saloon.reviews.length,
      };
    });

    return NextResponse.json(saloonsWithRating);
  } catch (error) {
    console.log("[PUBLIC_SALOONS_MAP_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export const runtime = "nodejs";

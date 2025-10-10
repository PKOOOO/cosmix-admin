// app/api/saloons/map/route.ts
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const lat = url.searchParams.get("lat");
    const lng = url.searchParams.get("lng");
    const radius = url.searchParams.get("radius") || "10"; // Default 10km radius

    // If coordinates are provided, filter by location
    let whereClause: any = {};
    
    if (lat && lng) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const radiusKm = parseFloat(radius);
      
      // Simple bounding box filter (for better performance)
      // This is a rough approximation - for production, consider using PostGIS
      const latRange = radiusKm / 111; // Roughly 1 degree = 111km
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
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        reviews: {
          select: {
            rating: true,
            comment: true,
            createdAt: true,
            user: {
              select: {
                name: true,
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate average rating for each saloon
    const saloonsWithRating = saloons.map(saloon => {
      const avgRating = saloon.reviews.length > 0 
        ? saloon.reviews.reduce((sum, review) => sum + review.rating, 0) / saloon.reviews.length
        : 0;

      return {
        ...saloon,
        averageRating: avgRating,
        reviewCount: saloon.reviews.length,
      };
    });

    return NextResponse.json(saloonsWithRating);
  } catch (error) {
    console.log("[SALOONS_MAP_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export const runtime = "nodejs";



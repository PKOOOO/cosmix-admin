import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

// List reviews for a saloon
export async function GET(
  req: Request,
  { params }: { params: { storeId: string; saloonId: string } }
) {
  try {
    if (!params.storeId || !params.saloonId) {
      return new NextResponse("Missing params", { status: 400 });
    }

    const saloon = await prismadb.saloon.findFirst({
      where: { id: params.saloonId, storeId: params.storeId },
      select: { id: true },
    });
    if (!saloon) return new NextResponse("Not found", { status: 404 });

    const reviews = await prismadb.saloonReview.findMany({
      where: { saloonId: params.saloonId },
      orderBy: { createdAt: "desc" },
    });
    const avg = await prismadb.saloonReview.aggregate({
      where: { saloonId: params.saloonId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return NextResponse.json({ reviews, averageRating: avg._avg.rating ?? 0, count: avg._count.rating ?? 0 });
  } catch (e) {
    return new NextResponse("Internal error", { status: 500 });
  }
}

// Create a review (intended for mobile app). Auth required.
export async function POST(
  req: Request,
  { params }: { params: { storeId: string; saloonId: string } }
) {
  try {
    const { userId: clerkUserId } = auth();
    if (!clerkUserId) return new NextResponse("Unauthenticated", { status: 401 });
    const body = await req.json();
    const { rating, comment } = body as { rating: number; comment?: string };
    if (!rating || rating < 1 || rating > 5) return new NextResponse("Invalid rating", { status: 400 });

    const saloon = await prismadb.saloon.findFirst({
      where: { id: params.saloonId, storeId: params.storeId },
      select: { id: true },
    });
    if (!saloon) return new NextResponse("Not found", { status: 404 });

    const user = await prismadb.user.findUnique({ where: { clerkId: clerkUserId } });
    if (!user) return new NextResponse("User not found", { status: 401 });

    const created = await prismadb.saloonReview.create({
      data: {
        saloonId: params.saloonId,
        userId: user.id,
        rating: Math.round(rating),
        comment: comment || null,
      },
    });

    return NextResponse.json(created);
  } catch (e) {
    return new NextResponse("Internal error", { status: 500 });
  }
}

export const runtime = "nodejs";



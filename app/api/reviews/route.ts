import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

// POST - Create a new review
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookingId, rating, comment } = body;

    if (!bookingId) {
      return new NextResponse("Booking ID is required", { status: 400 });
    }

    if (!rating || rating < 1 || rating > 5) {
      return new NextResponse("Rating must be between 1 and 5", { status: 400 });
    }

    // Get the booking to find the user, saloon, and verify it exists
    const booking = await prismadb.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: true,
        saloon: true,
      },
    });

    if (!booking) {
      return new NextResponse("Booking not found", { status: 404 });
    }

    // Check if a review already exists for this booking
    const existingReview = await prismadb.saloonReview.findFirst({
      where: {
        userId: booking.userId,
        saloonId: booking.saloonId,
      },
    });

    if (existingReview) {
      // Update existing review
      const updatedReview = await prismadb.saloonReview.update({
        where: { id: existingReview.id },
        data: {
          rating: rating,
          comment: comment || null,
        },
      });

      // Update saloon's average rating
      await updateSaloonRating(booking.saloonId);

      return NextResponse.json(updatedReview);
    }

    // Create new review
    const review = await prismadb.saloonReview.create({
      data: {
        userId: booking.userId,
        saloonId: booking.saloonId,
        rating: rating,
        comment: comment || null,
      },
    });

    // Update saloon's average rating
    await updateSaloonRating(booking.saloonId);

    return NextResponse.json(review);
  } catch (error) {
    console.error("[REVIEWS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// Helper function to update saloon's average rating
async function updateSaloonRating(saloonId: string) {
  const reviews = await prismadb.saloonReview.findMany({
    where: { saloonId },
    select: { rating: true },
  });

  if (reviews.length > 0) {
    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await prismadb.saloon.update({
      where: { id: saloonId },
      data: { rating: averageRating },
    });
  }
}

// GET - Get reviews for a saloon
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const saloonId = searchParams.get("saloonId");

    if (!saloonId) {
      return new NextResponse("Saloon ID is required", { status: 400 });
    }

    const reviews = await prismadb.saloonReview.findMany({
      where: { saloonId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            clerkId: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(reviews);
  } catch (error) {
    console.error("[REVIEWS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}


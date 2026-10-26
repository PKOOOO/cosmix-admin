import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { getEndUser } from "@/lib/admin-access";
import { notifyUser } from "@/lib/send-notification";

// POST - Create a new review
export async function POST(req: Request) {
  try {
    // A real signed-in customer only: the app's bearer key alone must not be
    // able to write (or overwrite) reviews and move a salon's rating.
    const user = await getEndUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

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

    // Only the customer who made the booking may review it (by account, or by
    // email for a guest checkout made before signing in).
    if (!booking || (booking.userId !== user.id && booking.customerEmail !== user.email)) {
      return new NextResponse("Booking not found", { status: 404 });
    }

    // Check if a review already exists for this booking
    const existingReview = await prismadb.saloonReview.findFirst({
      where: {
        bookingId: bookingId,
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
        bookingId: booking.id,
        rating: rating,
        comment: comment || null,
      },
    });

    // Update saloon's average rating
    await updateSaloonRating(booking.saloonId);

    // P8: tell the salon's provider about the new review (never blocks the response).
    const snippet = comment ? ` — "${String(comment).slice(0, 80)}"` : "";
    await notifyUser(
      booking.saloon.userId,
      "New review ⭐",
      `${"★".repeat(rating)}${"☆".repeat(5 - rating)}${snippet}`,
      { type: "provider_new_review", saloonId: booking.saloonId }
    );

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
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Public list: show only the reviewer's first name — never their email or
    // ids (this used to return both to anyone holding the app's bearer key).
    const publicReviews = reviews.map((review) => ({
      ...review,
      userId: undefined,
      user: { name: review.user?.name?.trim().split(/\s+/)[0] || null },
    }));

    return NextResponse.json(publicReviews);
  } catch (error) {
    console.error("[REVIEWS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}


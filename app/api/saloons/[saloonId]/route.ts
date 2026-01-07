// app/api/saloons/[saloonId]/route.ts
import { auth, currentUser } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { checkAdminAccess } from "@/lib/admin-access";

export async function GET(
  req: Request,
  { params }: { params: { saloonId: string } }
) {
  try {
    if (!params.saloonId) {
      return new NextResponse("Saloon ID is required", { status: 400 });
    }

    const saloon = await prismadb.saloon.findUnique({
      where: {
        id: params.saloonId,
      },
      include: {
        images: true,
        saloonServices: {
          include: {
            service: {
              include: {
                category: true,
              }
            }
          }
        }
      }
    });

    if (!saloon) {
      return new NextResponse("Saloon not found", { status: 404 });
    }

    return NextResponse.json(saloon);
  } catch (error) {
    console.log("[SALOON_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { saloonId: string } }
) {
  try {
    const { user } = await checkAdminAccess();
    const body = await req.json();

    const { name, description, shortIntro, address, images, selectedServices, latitude, longitude } = body;

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    if (!params.saloonId) {
      return new NextResponse("Saloon ID is required", { status: 400 });
    }

    // Check if the user owns this saloon
    const saloonByUserId = await prismadb.saloon.findFirst({
      where: {
        id: params.saloonId,
        userId: user.id,
      },
    });

    if (!saloonByUserId) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    // Update the saloon
    const saloon = await prismadb.saloon.update({
      where: {
        id: params.saloonId,
      },
      data: {
        name,
        description,
        shortIntro,
        address,
        latitude,
        longitude,
        ...(images && {
          images: {
            deleteMany: {},
            createMany: {
              data: images.map((image: { url: string }) => image),
            },
          },
        }),
      },
    });

    // Update saloon-service relationships
    if (selectedServices !== undefined) {
      // Delete existing saloon-service relationships
      await prismadb.saloonService.deleteMany({
        where: {
          saloonId: params.saloonId,
        },
      });

      // Create new saloon-service relationships
      if (selectedServices.length > 0) {
        const saloonServiceData = selectedServices.map((serviceId: string) => ({
          saloonId: params.saloonId,
          serviceId: serviceId,
          price: 0, // Default price - can be updated later
          durationMinutes: 30, // Default duration - can be updated later
          isAvailable: true,
        }));

        await prismadb.saloonService.createMany({
          data: saloonServiceData,
        });
      }
    }

    return NextResponse.json(saloon);
  } catch (error) {
    console.log("[SALOON_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { saloonId: string } }
) {
  try {
    const { user } = await checkAdminAccess();

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.saloonId) {
      return new NextResponse("Saloon ID is required", { status: 400 });
    }

    // Check if the user owns this saloon
    const saloonByUserId = await prismadb.saloon.findFirst({
      where: {
        id: params.saloonId,
        userId: user.id,
      },
    });

    if (!saloonByUserId) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    // Check if user has remaining saloons
    const remainingSaloons = await prismadb.saloon.count({
      where: {
        userId: user.id,
      },
    });

    // First, delete all services offered by this saloon (SaloonService junction table)
    await prismadb.saloonService.deleteMany({
      where: {
        saloonId: params.saloonId,
      },
    });

    // Delete all bookings for this saloon
    await prismadb.booking.deleteMany({
      where: {
        saloonId: params.saloonId,
      },
    });

    // Delete the saloon (other relations like images, reviews, timeSlots have onDelete: Cascade)
    const saloon = await prismadb.saloon.delete({
      where: {
        id: params.saloonId,
      },
    });

    return NextResponse.json({
      ...saloon,
      hasRemainingSaloons: remainingSaloons > 1
    });
  } catch (error) {
    console.log("[SALOON_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export const runtime = "nodejs";

// app/api/saloons/route.ts
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { requireServiceUser } from "@/lib/service-auth";

export async function POST(req: Request) {
  try {
    const serviceUser = await requireServiceUser(req as any);
    const body = await req.json();

    const { name, description, shortIntro, address, images, selectedServices, latitude, longitude } = body;

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }
    if (!images || !images.length) {
      return new NextResponse("Images are required", { status: 400 });
    }

    // Create the saloon for this user (no store required)
    const saloon = await prismadb.saloon.create({
      data: {
        name,
        description,
        shortIntro,
        address,
        latitude,
        longitude,
        userId: serviceUser.id,
        images: {
          createMany: {
            data: images.map((image: { url: string }) => image),
          },
        },
      },
    });

    // Create saloon-service relationships for selected services
    if (selectedServices && selectedServices.length > 0) {
      const saloonServiceData = selectedServices.map((serviceId: string) => ({
        saloonId: saloon.id,
        serviceId: serviceId,
        price: 0, // Default price - can be updated later
        durationMinutes: 30, // Default duration - can be updated later
        isAvailable: true,
      }));

      await prismadb.saloonService.createMany({
        data: saloonServiceData,
      });
    }

    return NextResponse.json(saloon);
  } catch (error) {
    console.log("[SALOONS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// Get all saloons for the current user
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const owned = url.searchParams.get("owned");

    // Default filter: all, but if owned=1, restrict to service admin
    const baseWhere: any = {};

    // If owned=1, restrict to current user's saloons
    if (owned) {
      const serviceUser = await requireServiceUser(req as any);
      baseWhere.userId = serviceUser.id;
    }

    const saloons = await prismadb.saloon.findMany({
      where: baseWhere,
      include: {
        images: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(saloons);
  } catch (error) {
    console.log("[SALOONS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export const runtime = "nodejs";

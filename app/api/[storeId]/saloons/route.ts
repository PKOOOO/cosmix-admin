// app/api/[storeId]/saloons/route.ts
import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function POST(
  req: Request,
  { params }: { params: { storeId: string } }
) {
  try {
    const { userId } = auth();
    const body = await req.json();

    const { name, description, shortIntro, address, images } = body;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }
    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }
    if (!images || !images.length) {
      return new NextResponse("Images are required", { status: 400 });
    }
    if (!params.storeId) {
      return new NextResponse("Store ID is required", { status: 400 });
    }

    // Find the user record using Clerk ID
    const user = await prismadb.user.findUnique({
      where: {
        clerkId: userId,
      },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 401 });
    }

    // Verify the user owns this store
    const storeByUserId = await prismadb.store.findFirst({
      where: {
        id: params.storeId,
        userId: user.id,
      },
    });

    if (!storeByUserId) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    // ✅ Create the saloon with storeId
    const saloon = await prismadb.saloon.create({
      data: {
        name,
        description,
        shortIntro,
        address,
        userId: user.id,
        storeId: params.storeId, // 👈 added this
        images: {
          createMany: {
            data: images.map((image: { url: string }) => image),
          },
        },
      },
    });

    return NextResponse.json(saloon);
  } catch (error) {
    console.log("[SALOONS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// ✅ Get all saloons for the specific store
export async function GET(
  req: Request,
  { params }: { params: { storeId: string } }
) {
  try {
    if (!params.storeId) {
      return new NextResponse("Store ID is required", { status: 400 });
    }

    // ✅ Filter by storeId, not userId
    const saloons = await prismadb.saloon.findMany({
      where: {
        storeId: params.storeId,
      },
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

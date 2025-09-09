// app/api/[storeId]/saloons/route.ts
import { auth, currentUser } from "@clerk/nextjs";
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

    // Ensure the Clerk user exists in our DB (create on the fly if missing)
    let user = await prismadb.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      const cu = await currentUser();
      const email = cu?.emailAddresses?.[0]?.emailAddress;
      if (!email) return new NextResponse("User email missing", { status: 401 });
      user = await prismadb.user.create({
        data: {
          clerkId: userId,
          email,
          name: cu?.firstName || cu?.username || null,
        },
      });
    }

    // Verify the store exists (shared store model; ownership not required)
    const storeExists = await prismadb.store.findUnique({ where: { id: params.storeId } });
    if (!storeExists) {
      return new NextResponse("Store not found", { status: 404 });
    }

    // ✅ Create the saloon with storeId for this user (no store ownership required)
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

    const url = new URL(req.url);
    const owned = url.searchParams.get("owned");

    // Default filter by store
    const baseWhere: any = { storeId: params.storeId };

    // If owned=1, restrict to current user's saloons
    if (owned) {
      const { userId: clerkUserId } = auth();
      if (!clerkUserId) {
        return new NextResponse("Unauthenticated", { status: 401 });
      }
      let user = await prismadb.user.findUnique({ where: { clerkId: clerkUserId } });
      if (!user) {
        const cu = await currentUser();
        const email = cu?.emailAddresses?.[0]?.emailAddress;
        if (!email) return new NextResponse("User email missing", { status: 401 });
        user = await prismadb.user.create({
          data: {
            clerkId: clerkUserId,
            email,
            name: cu?.firstName || cu?.username || null,
          },
        });
      }
      baseWhere.userId = user.id;
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

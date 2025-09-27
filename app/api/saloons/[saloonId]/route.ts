// app/api/saloons/[saloonId]/route.ts
import { auth, currentUser } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

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
    const { userId } = auth();
    const body = await req.json();

    const { name, description, shortIntro, address, images } = body;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    if (!params.saloonId) {
      return new NextResponse("Saloon ID is required", { status: 400 });
    }

    // Ensure the Clerk user exists in our DB
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
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    if (!params.saloonId) {
      return new NextResponse("Saloon ID is required", { status: 400 });
    }

    // Ensure the Clerk user exists in our DB
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

    // Delete the saloon
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

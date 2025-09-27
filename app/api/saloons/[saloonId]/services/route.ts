// app/api/saloons/[saloonId]/services/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function POST(
    req: NextRequest,
    { params }: { params: { saloonId: string } }
) {
    try {
        const { userId } = auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { serviceId, price, durationMinutes, isAvailable, availableDays } = body;

        if (!serviceId || price === undefined || !durationMinutes) {
            return new NextResponse("Missing required fields", { status: 400 });
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

        // Verify saloon ownership
        const saloon = await prismadb.saloon.findFirst({
            where: {
                id: params.saloonId,
                userId: user.id
            }
        });

        if (!saloon) {
            return new NextResponse("Saloon not found", { status: 404 });
        }

        // Check if service already exists for this saloon
        const existingService = await prismadb.saloonService.findUnique({
            where: {
                saloonId_serviceId: {
                    saloonId: params.saloonId,
                    serviceId: serviceId
                }
            }
        });

        if (existingService) {
            return new NextResponse("Service already exists for this saloon", { status: 400 });
        }

        // Create saloon service
        const saloonService = await prismadb.saloonService.create({
            data: {
                saloonId: params.saloonId,
                serviceId,
                price,
                durationMinutes,
                isAvailable: isAvailable ?? true,
                availableDays: availableDays ?? [1, 2, 3, 4, 5] // Default to weekdays
            }
        });

        return NextResponse.json(saloonService);

    } catch (error) {
        console.error("[SALOON_SERVICE_POST]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export async function GET(
    req: NextRequest,
    { params }: { params: { saloonId: string } }
) {
    try {
        const { userId } = auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
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

        // Verify saloon ownership
        const saloon = await prismadb.saloon.findFirst({
            where: {
                id: params.saloonId,
                userId: user.id
            }
        });

        if (!saloon) {
            return new NextResponse("Saloon not found", { status: 404 });
        }

        // Get all services for this saloon
        const saloonServices = await prismadb.saloonService.findMany({
            where: {
                saloonId: params.saloonId
            },
            include: {
                service: {
                    include: {
                        category: true
                    }
                }
            }
        });

        return NextResponse.json(saloonServices);

    } catch (error) {
        console.error("[SALOON_SERVICE_GET]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

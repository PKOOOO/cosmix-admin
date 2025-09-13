// app/(dashboard)/[storeId]/(routes)/saloons/[saloonId]/pricing/page.tsx
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import prismadb from "@/lib/prismadb";
import { PricingForm } from "./components/pricing-form";

const PricingPage = async ({
    params
}: {
    params: { storeId: string; saloonId: string }
}) => {
    const { userId } = auth();

    if (!userId) {
        redirect('/sign-in');
    }

    // Find the user record using Clerk ID
    const user = await prismadb.user.findUnique({
        where: {
            clerkId: userId
        }
    });

    if (!user) {
        redirect('/sign-in');
    }

    // Verify the store exists (shared store model - no ownership required)
    const store = await prismadb.store.findUnique({
        where: {
            id: params.storeId,
        },
    });

    if (!store) {
        redirect('/');
    }

    // Get the saloon with its services and current pricing
    const saloon = await prismadb.saloon.findFirst({
        where: {
            id: params.saloonId,
            storeId: params.storeId,
            userId: user.id, // Ensure user owns this specific saloon
        },
        include: {
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
        redirect(`/${params.storeId}/saloons`);
    }

    // Get all available sub-services for this store that aren't already assigned to this saloon
    const availableSubServices = await prismadb.service.findMany({
        where: {
            categoryId: {
                in: await prismadb.category.findMany({
                    where: { storeId: params.storeId },
                    select: { id: true }
                }).then(cats => cats.map(c => c.id))
            },
            parentServiceId: { not: null }, // Only sub-services
            saloonServices: {
                none: {
                    saloonId: params.saloonId
                }
            }
        },
        include: {
            category: true,
            parentService: true,
        }
    });

    // Format current pricing data
    const currentPricing = saloon.saloonServices
        .filter(ss => ss.service.parentServiceId !== null)
        .map(ss => ({
            serviceId: ss.serviceId,
            serviceName: ss.service.name,
            categoryName: ss.service.category.name,
            parentServiceName: ss.service.parentService?.name || '',
            price: ss.price,
            durationMinutes: ss.durationMinutes,
            isAvailable: ss.isAvailable,
            availableDays: ss.availableDays || [],
        }));

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Service Pricing</h1>
                        <p className="text-muted-foreground">
                            Manage pricing for sub-services at {saloon.name}
                        </p>
                    </div>
                </div>
                <div className="space-y-4">
                    <PricingForm
                        saloonId={params.saloonId}
                        storeId={params.storeId}
                        saloonName={saloon.name}
                        currentPricing={currentPricing}
                        availableSubServices={availableSubServices.map(service => ({
                            id: service.id,
                            name: service.name,
                            categoryName: service.category.name,
                            parentServiceName: service.parentService?.name || '',
                        }))}
                    />
                </div>
            </div>
        </div>
    );
};

export default PricingPage;
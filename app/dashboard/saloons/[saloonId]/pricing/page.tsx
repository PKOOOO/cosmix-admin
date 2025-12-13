import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import prismadb from "@/lib/prismadb";
import { PricingClient } from "./components/pricing-client";
import { checkAdminAccess } from "@/lib/admin-access";

interface PricingPageProps {
    params: {
        saloonId: string;
    };
}

const PricingPage = async ({ params }: PricingPageProps) => {
    const { user } = await checkAdminAccess();

    if (!user) {
        redirect('/');
    }

    // Find the saloon and verify ownership
    const saloon = await prismadb.saloon.findFirst({
        where: {
            id: params.saloonId,
            userId: user.id
        },
        include: {
            saloonServices: {
                include: {
                    service: {
                        include: {
                            category: true
                        }
                    }
                }
            }
        }
    });

    if (!saloon) {
        redirect('/dashboard/saloons');
    }

    // Get all services that can be added to this saloon
    const availableServices = await prismadb.service.findMany({
        where: {
            category: {
                saloon: {
                    userId: user.id
                }
            }
        },
        include: {
            category: true
        }
    });

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <PricingClient
                    saloon={saloon as any}
                    availableServices={availableServices as any}
                />
            </div>
        </div>
    );
};

export default PricingPage;

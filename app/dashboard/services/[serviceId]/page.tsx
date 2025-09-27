// app/(dashboard)/services/[serviceId]/page.tsx
import prismadb from "@/lib/prismadb";
import { ServiceForm } from "./components/service-form";
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";

const ServicePage = async ({
    params,
}: {
    params: { serviceId: string };
}) => {
    const { userId } = auth();
    
    if (!userId) {
        redirect('/');
    }

    // Find the user in your database using the Clerk ID
    const user = await prismadb.user.findUnique({
        where: { 
            clerkId: userId 
        }
    });

    if (!user) {
        redirect('/');
    }

    const service = await prismadb.service.findUnique({
        where: {
            id: params.serviceId,
        },
        include: {
            category: true,
            saloonServices: {
                where: {
                    saloon: {
                        userId: user.id
                    }
                },
                include: {
                    saloon: {
                        select: {
                            id: true,
                            name: true,
                        }
                    }
                }
            }
        },
    });

    if (!service) {
        redirect('/dashboard/services');
    }

    // Check if user has access to this service through their saloons
    if (service.saloonServices.length === 0) {
        redirect('/dashboard/services');
    }

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6 ">
                <ServiceForm initialData={service} />
            </div>
        </div>
    );
};

export default ServicePage;

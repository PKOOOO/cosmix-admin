// app/(dashboard)/dashboard/saloons/[saloonId]/page.tsx
import prismadb from "@/lib/prismadb";
import { SaloonForm } from "./components/saloon-form";
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";

const SaloonPage = async ({
    params,
}: {
    params: { saloonId: string };
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

    const saloon = await prismadb.saloon.findUnique({
        where: {
            id: params.saloonId,
            userId: user.id, // Ensure user owns this saloon
        },
        include: {
            images: true,
        },
    });

    if (!saloon) {
        redirect('/dashboard/saloons');
    }

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6 ">
                <SaloonForm initialData={saloon} />
            </div>
        </div>
    );
};

export default SaloonPage;

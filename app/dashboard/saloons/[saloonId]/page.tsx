import prismadb from "@/lib/prismadb";
import { SaloonForm } from "./components/saloon-form";
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { checkAdminAccess } from "@/lib/admin-access";

const SaloonPage = async ({
    params,
}: {
    params: { saloonId: string };
}) => {
    const { user } = await checkAdminAccess();

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
            <div className="flex-1 space-y-4 p-4 sm:p-8 pt-2">
                <SaloonForm initialData={saloon} />
            </div>
        </div>
    );
};

export default SaloonPage;

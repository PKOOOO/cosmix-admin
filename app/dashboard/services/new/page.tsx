// app/(dashboard)/dashboard/services/new/page.tsx
export const dynamic = 'force-dynamic';

import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { ServiceForm } from "./components/service-form";
import { checkAdminAccess } from "@/lib/admin-access";

const NewServicePage = async () => {
    const { user } = await checkAdminAccess();

    if (!user) {
        redirect('/');
    }

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6 ">
                <ServiceForm initialData={null} />
            </div>
        </div>
    );
};

export default NewServicePage;

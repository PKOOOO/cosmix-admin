// app/(dashboard)/dashboard/services/new/page.tsx
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { ServiceForm } from "./components/service-form";

const NewServicePage = async () => {
    const { userId } = auth();
    
    if (!userId) {
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

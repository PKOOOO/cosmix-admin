import prismadb from "@/lib/prismadb";
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { SettingsForm } from "./components/settings-form";
import { checkSalonAccess } from "@/lib/salon-access";

interface SettingsPageProps {
    params: {
        storeId: string;
    }
};

const SettingsPage: React.FC<SettingsPageProps> = async ({
    params
}) => {
    // Check if user has salons, redirect if not
    await checkSalonAccess(params.storeId);
    
    const { userId } = auth();

    if (!userId) {
        redirect("/");
    }

    // First, find the user record using Clerk ID
    const user = await prismadb.user.findUnique({
        where: {
            clerkId: userId
        }
    });

    if (!user) {
        redirect("/");
    }

    // Check if the store exists (shared store model - no ownership required)
    const store = await prismadb.store.findUnique({
        where: {
            id: params.storeId,
        }
    });

    if (!store) {
        redirect("/");
    }

    return ( 
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <SettingsForm initialData={store}/>
            </div>
        </div>
    );
}
 
export default SettingsPage;
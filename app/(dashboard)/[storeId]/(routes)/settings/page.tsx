import prismadb from "@/lib/prismadb";
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { SettingsForm } from "./components/settings-form";

interface SettingsPageProps {
    params: {
        storeId: string;
    }
};

const SettingsPage: React.FC<SettingsPageProps> = async ({
    params
}) => {
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

    // Now use the database user ID for store lookup
    const store = await prismadb.store.findFirst({
        where: {
            id: params.storeId,
            userId: user.id // Use database user ID, not Clerk ID
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
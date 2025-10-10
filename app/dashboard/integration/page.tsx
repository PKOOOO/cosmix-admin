// app/dashboard/integration/page.tsx
import { IntegrationClient } from "./components/integration-client";
import prismadb from "@/lib/prismadb";
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";

const IntegrationPage = async () => {
    const { userId: clerkUserId } = auth();
    
    if (!clerkUserId) {
        redirect('/');
    }

    // Find the user in your database using the Clerk ID
    const user = await prismadb.user.findUnique({
        where: { 
            clerkId: clerkUserId 
        }
    });

    if (!user) {
        redirect('/');
    }

    // Check if user has any saloons
    const userSaloons = await prismadb.saloon.findMany({
        where: {
            userId: user.id
        }
    });

    if (userSaloons.length === 0) {
        redirect('/dashboard/saloons');
    }

    // Check Paytrail configuration status
    const paytrailConfigured = !!(process.env.PAYTRAIL_MERCHANT_ID && process.env.PAYTRAIL_SECRET_KEY);

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
                <IntegrationClient connections={{ paytrail: paytrailConfigured }} />
            </div>
        </div>
    );
}

export default IntegrationPage;

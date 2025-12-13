// app/dashboard/integration/page.tsx
export const dynamic = 'force-dynamic';

import { IntegrationClient } from "./components/integration-client";
import prismadb from "@/lib/prismadb";
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { checkAdminAccess } from "@/lib/admin-access";

const IntegrationPage = async () => {
    const { user } = await checkAdminAccess();

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

    // Check Stripe connection status
    const stripeConnected = !!user.stripeId;

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
                <IntegrationClient connections={{ stripe: stripeConnected }} />
            </div>
        </div>
    );
}

export default IntegrationPage;

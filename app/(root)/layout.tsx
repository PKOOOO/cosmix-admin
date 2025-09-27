// app/(root)/layout.tsx
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";

import prismadb from "@/lib/prismadb";

export default async function SetupLayout({
    children
}: {
    children: React.ReactNode;
}) {
    const { userId } = auth();

    if (!userId) {
        redirect('/');
    }

    // Find the user record using Clerk ID
    const user = await prismadb.user.findUnique({
        where: {
            clerkId: userId
        }
    });

    if (!user) {
        redirect('/');
    }

    // Check if user has any saloons
    const userSaloons = await prismadb.saloon.findMany({
        where: {
            userId: user.id
        },
        orderBy: {
            createdAt: 'asc'
        }
    });

    if (userSaloons.length > 0) {
        // If user has saloons, redirect to dashboard
        redirect('/dashboard');
    }

    // If no saloons exist, allow saloon creation
    return (
        <>
        {children}
        </>
    );
};
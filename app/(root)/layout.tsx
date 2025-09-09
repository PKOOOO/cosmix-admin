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

    // Check if ANY store exists in the database (shared store approach)
    const sharedStore = await prismadb.store.findFirst({
        orderBy: {
            createdAt: 'asc' // Get the first/oldest store
        }
    });

    if (sharedStore) {
        // If a store exists, redirect all users to it
        redirect(`/${sharedStore.id}`);
    }

    // If no store exists at all, allow store creation
    return (
        <>
        {children}
        </>
    );
};
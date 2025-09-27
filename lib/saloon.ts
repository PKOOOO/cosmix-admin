import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export function getSelectedSaloonId(): string | undefined {
    const cookieStore = cookies();
    const key = `selectedSaloonId`;
    return cookieStore.get(key)?.value;
}

export async function getOwnedSelectedSaloonId(): Promise<string | undefined> {
    const selected = getSelectedSaloonId();
    if (!selected) return undefined;
    const { userId: clerkUserId } = auth();
    if (!clerkUserId) return undefined;
    const user = await prismadb.user.findUnique({ where: { clerkId: clerkUserId } });
    if (!user) return undefined;
    const saloon = await prismadb.saloon.findFirst({
        where: { id: selected, userId: user.id },
        select: { id: true },
    });
    return saloon?.id;
}

export async function getOwnedSelectedSaloon(): Promise<{ id: string; name: string } | undefined> {
    const { userId: clerkUserId } = auth();
    if (!clerkUserId) return undefined;
    const user = await prismadb.user.findUnique({ where: { clerkId: clerkUserId } });
    if (!user) return undefined;
    const selected = getSelectedSaloonId();
    if (!selected) return undefined;
    const saloon = await prismadb.saloon.findFirst({
        where: { id: selected, userId: user.id },
        select: { id: true, name: true },
    });
    if (!saloon) return undefined;
    return { id: saloon.id, name: saloon.name };
}



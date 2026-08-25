import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { ADMIN_EXTERNAL_ID } from "@/lib/service-auth";

// `auth()` resolves to lib/fake-clerk via the tsconfig "paths" alias, so it
// returns the synthetic service id on every request. It must never be used as
// a `clerkId` lookup key: it resolves to the shared service row, and ownership
// checks would then pass against data that belongs to nobody.
const realClerkUserId = (id: string | null | undefined) =>
    id && id !== ADMIN_EXTERNAL_ID ? id : null;

export function getSelectedSaloonId(): string | undefined {
    const cookieStore = cookies();
    const key = `selectedSaloonId`;
    return cookieStore.get(key)?.value;
}

export async function getOwnedSelectedSaloonId(): Promise<string | undefined> {
    const selected = getSelectedSaloonId();
    if (!selected) return undefined;
    const clerkUserId = realClerkUserId(auth().userId);
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
    const clerkUserId = realClerkUserId(auth().userId);
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



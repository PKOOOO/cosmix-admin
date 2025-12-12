import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { checkAdminAccess } from "@/lib/admin-access";
import prismadb from "@/lib/prismadb";

// Simple JWT decode (no verification needed for public claims like userId)
function decodeJWT(token: string): { sub?: string } | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        return payload;
    } catch {
        return null;
    }
}

export async function GET(req: Request) {
    try {
        // First check bearer token (service admin)
        const { isAdmin: bearerAdmin, user: bearerUser } = await checkAdminAccess();
        if (bearerAdmin && bearerUser) {
            return NextResponse.json({ 
                isAdmin: true, 
                user: { id: bearerUser.id, name: bearerUser.name, email: bearerUser.email } 
            });
        }

        // Otherwise, check Clerk token from X-User-Token header
        const headerPayload = headers();
        const clerkToken = headerPayload.get("x-user-token");
        
        if (!clerkToken) {
            return NextResponse.json({ isAdmin: false, user: null });
        }

        // Decode JWT to get userId
        const decoded = decodeJWT(clerkToken);
        const clerkUserId = decoded?.sub;

        if (!clerkUserId) {
            return NextResponse.json({ isAdmin: false, user: null });
        }

        // Find or create the Clerk user in DB
        let user = await prismadb.user.findUnique({
            where: { clerkId: clerkUserId },
        });

        if (!user) {
            user = await prismadb.user.create({
                data: {
                    clerkId: clerkUserId,
                    email: `${clerkUserId}@temp.local`,
                    name: "New User",
                },
            });
        }

        // If no admins exist yet, promote this user
        const adminCount = await prismadb.user.count({ where: { isAdmin: true } });
        if (adminCount === 0 && !user.isAdmin) {
            user = await prismadb.user.update({
                where: { id: user.id },
                data: { isAdmin: true },
            });
        }

        return NextResponse.json({ 
            isAdmin: user.isAdmin, 
            user: { id: user.id, name: user.name, email: user.email } 
        });
    } catch (error) {
        console.log('[ADMIN_CHECK]', error);
        return NextResponse.json({ isAdmin: false, user: null });
    }
}

export const runtime = "nodejs";

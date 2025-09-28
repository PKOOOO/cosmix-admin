import { NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin-access";

export async function GET() {
    try {
        const { isAdmin, user } = await checkAdminAccess();
        
        return NextResponse.json({ 
            isAdmin, 
            user: user ? { id: user.id, name: user.name, email: user.email } : null 
        });
    } catch (error) {
        console.log('[ADMIN_CHECK]', error);
        return NextResponse.json({ isAdmin: false, user: null });
    }
}

export const runtime = "nodejs";

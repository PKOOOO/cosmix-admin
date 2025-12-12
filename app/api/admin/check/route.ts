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
        // First check Clerk token from X-User-Token header (user-specific check)
        const headerPayload = headers();
        const clerkToken = headerPayload.get("x-user-token");
        
        console.log('[ADMIN_CHECK] Clerk token present:', !!clerkToken);
        
        if (clerkToken) {
            // Decode JWT to get userId
            const decoded = decodeJWT(clerkToken);
            const clerkUserId = decoded?.sub;

            console.log('[ADMIN_CHECK] Decoded Clerk userId:', clerkUserId);

            if (clerkUserId) {
                // Find or create the Clerk user in DB
                let user = await prismadb.user.findUnique({
                    where: { clerkId: clerkUserId },
                });

                // Check admin count BEFORE creating user to avoid race conditions
                const adminCount = await prismadb.user.count({ where: { isAdmin: true } });
                const shouldPromoteToAdmin = adminCount === 0;

                if (!user) {
                    console.log('[ADMIN_CHECK] Creating new user for:', clerkUserId, 'Will promote to admin:', shouldPromoteToAdmin);
                    try {
                        user = await prismadb.user.create({
                            data: {
                                clerkId: clerkUserId,
                                email: `${clerkUserId}@temp.local`,
                                name: "New User",
                                isAdmin: shouldPromoteToAdmin, // Set admin flag during creation
                            },
                        });
                        console.log('[ADMIN_CHECK] User created with isAdmin:', user.isAdmin);
                    } catch (createError: any) {
                        // If user was created by another request, fetch it
                        if (createError.code === 'P2002') {
                            console.log('[ADMIN_CHECK] User already exists, fetching...');
                            user = await prismadb.user.findUnique({
                                where: { clerkId: clerkUserId },
                            });
                        } else {
                            throw createError;
                        }
                    }
                }

                // If user exists but wasn't promoted and no admins exist, promote them
                if (user && !user.isAdmin && adminCount === 0) {
                    console.log('[ADMIN_CHECK] Promoting existing user to admin');
                    try {
                        // Double-check admin count before promoting (race condition protection)
                        const currentAdminCount = await prismadb.user.count({ where: { isAdmin: true } });
                        if (currentAdminCount === 0) {
                            user = await prismadb.user.update({
                                where: { id: user.id },
                                data: { isAdmin: true },
                            });
                            console.log('[ADMIN_CHECK] Successfully promoted user to admin');
                        } else {
                            console.log('[ADMIN_CHECK] Admin already exists, not promoting');
                        }
                    } catch (updateError: any) {
                        console.error('[ADMIN_CHECK] Failed to promote user:', updateError);
                        // Refetch user to get current state
                        user = await prismadb.user.findUnique({
                            where: { clerkId: clerkUserId },
                        });
                    }
                } else if (user && user.isAdmin) {
                    console.log('[ADMIN_CHECK] User is already admin');
                } else if (user && !user.isAdmin && adminCount > 0) {
                    console.log('[ADMIN_CHECK] Admin already exists, user is not admin');
                }

                if (!user) {
                    console.log('[ADMIN_CHECK] User not found after processing');
                    return NextResponse.json({ isAdmin: false, user: null });
                }

                console.log('[ADMIN_CHECK] Returning isAdmin:', user.isAdmin, 'for user:', user.email);
                return NextResponse.json({ 
                    isAdmin: user.isAdmin, 
                    user: { id: user.id, name: user.name, email: user.email } 
                });
            }
        }

        // Fallback: check bearer token (service admin) only if no Clerk token
        const { isAdmin: bearerAdmin, user: bearerUser } = await checkAdminAccess();
        if (bearerAdmin && bearerUser) {
            return NextResponse.json({ 
                isAdmin: true, 
                user: { id: bearerUser.id, name: bearerUser.name, email: bearerUser.email } 
            });
        }

        // No valid auth found
        return NextResponse.json({ isAdmin: false, user: null });
    } catch (error) {
        console.log('[ADMIN_CHECK]', error);
        return NextResponse.json({ isAdmin: false, user: null });
    }
}

export const runtime = "nodejs";

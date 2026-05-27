import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { checkAdminAccess } from "@/lib/admin-access";
import { verifyToken } from "@clerk/backend";
import prismadb from "@/lib/prismadb";
import { getOrCreateUserFromClerk } from "@/lib/get-or-create-user";

/**
 * SECURITY NOTE: We do NOT decode JWT tokens manually anymore.
 * Previously we had a decodeJWT function that decoded tokens without signature verification,
 * which allowed anyone to forge tokens and create fake users in the database.
 * 
 * Now we ONLY use Clerk's verifyToken from @clerk/backend to validate tokens.
 */

/**
 * Verify a Clerk JWT token using Clerk's backend API
 * This ensures the token is actually signed by Clerk and not forged
 */
async function verifyClerkToken(token: string): Promise<string | null> {
    try {
        // Issuer is derived automatically from CLERK_SECRET_KEY in @clerk/backend v1+.
        const verifiedToken = await verifyToken(token, {
            secretKey: process.env.CLERK_SECRET_KEY,
            clockSkewInMs: 300000, // 5 minutes for network latency
        });

        if (verifiedToken && verifiedToken.sub) {
            console.log('[ADMIN_CHECK] Token verified successfully, userId:', verifiedToken.sub);
            return verifiedToken.sub;
        }

        console.log('[ADMIN_CHECK] Token verification returned no userId');
        return null;
    } catch (error: any) {
        console.log('[ADMIN_CHECK] Token verification failed:', error?.message || error);
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
            // CRITICAL: Verify the token with Clerk's API, don't just decode it!
            const clerkUserId = await verifyClerkToken(clerkToken);

            console.log('[ADMIN_CHECK] Verified Clerk userId:', clerkUserId);

            // SECURITY: If token was provided but verification failed, DENY ACCESS
            if (!clerkUserId) {
                console.log('[ADMIN_CHECK] SECURITY: Token verification failed, denying access');
                return NextResponse.json({
                    isAdmin: false,
                    hasSaloons: false,
                    user: null,
                    error: 'Invalid token'
                }, { status: 401 });
            }

            const user = await getOrCreateUserFromClerk(clerkUserId);

            if (!user) {
                console.log('[ADMIN_CHECK] getOrCreateUserFromClerk returned null');
                return NextResponse.json({ isAdmin: false, user: null });
            }

            console.log('[ADMIN_CHECK] Returning isAdmin:', user.isAdmin, 'for user:', user.email);
            // Check if user has any saloons
            const saloonsCount = await prismadb.saloon.count({
                where: { userId: user.id }
            });

            console.log('[ADMIN_CHECK] Returning isAdmin:', user.isAdmin, 'hasSaloons:', saloonsCount > 0, 'providerStatus:', user.providerStatus);
            return NextResponse.json({
                isAdmin: user.isAdmin,
                hasSaloons: saloonsCount > 0,
                providerStatus: user.providerStatus ?? 'NOT_APPLIED',
                user: { id: user.id, name: user.name, email: user.email }
            });
        }

        // Fallback: check bearer token (service admin) only if no Clerk token was present at all
        // If a Clerk token was present but invalid/missing user, we should return false, not fall back
        if (!clerkToken) {
            const { isAdmin: bearerAdmin, user: bearerUser } = await checkAdminAccess();
            if (bearerAdmin && bearerUser) {
                console.log('[ADMIN_CHECK] Returning bearer token admin');
                // Check if bearer user has any saloons
                const saloonsCount = await prismadb.saloon.count({
                    where: { userId: bearerUser.id }
                });

                console.log('[ADMIN_CHECK] Returning bearer token admin. hasSaloons:', saloonsCount > 0);
                return NextResponse.json({
                    isAdmin: true,
                    hasSaloons: saloonsCount > 0,
                    providerStatus: 'ACTIVE',
                    user: { id: bearerUser.id, name: bearerUser.name, email: bearerUser.email }
                });
            }
        }

        // No valid auth found or Clerk token was present but user is not admin
        console.log('[ADMIN_CHECK] No valid admin access found');
        return NextResponse.json({ isAdmin: false, hasSaloons: false, user: null });
    } catch (error) {
        console.log('[ADMIN_CHECK]', error);
        return NextResponse.json({ isAdmin: false, hasSaloons: false, user: null });
    }
}

export const runtime = "nodejs";

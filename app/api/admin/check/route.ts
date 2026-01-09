import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { checkAdminAccess } from "@/lib/admin-access";
import { currentUser } from "@clerk/nextjs";
import { verifyToken } from "@clerk/backend";
import prismadb from "@/lib/prismadb";

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
        // Use Clerk's verifyToken to validate the JWT
        // This checks the signature, expiration, etc.
        // Get issuer from env or construct from publishable key
        // The issuer is typically https://<your-clerk-subdomain>.clerk.accounts.dev
        const issuer = process.env.CLERK_JWT_ISSUER ||
            (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.includes('pk_test_')
                ? `https://${process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.replace('pk_test_', '').replace('$', '')}.clerk.accounts.dev`
                : null);

        const verifiedToken = await verifyToken(token, {
            secretKey: process.env.CLERK_SECRET_KEY,
            issuer: issuer,
            clockSkewInMs: 300000, // Allow 5 minutes of clock skew
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

            // Get user details from Clerk to get real email
            let clerkUserEmail = `${clerkUserId}@clerk.local`;
            let clerkUserName = "New User";

            try {
                const clerkUser = await currentUser();
                if (clerkUser) {
                    clerkUserEmail = clerkUser.emailAddresses[0]?.emailAddress || clerkUserEmail;
                    clerkUserName = clerkUser.firstName && clerkUser.lastName
                        ? `${clerkUser.firstName} ${clerkUser.lastName}`.trim()
                        : clerkUser.firstName || clerkUser.lastName || clerkUserEmail.split('@')[0] || "New User";
                }
            } catch (error) {
                console.log('[ADMIN_CHECK] Could not fetch Clerk user details:', error);
            }

            // Find or create the Clerk user in DB
            let user = await prismadb.user.findUnique({
                where: { clerkId: clerkUserId },
            });

            console.log('[ADMIN_CHECK] Looking up user with clerkId:', clerkUserId, 'Found:', !!user);

            // Check if any Clerk user is already admin (exclude service-admin)
            // First Clerk user to sign in becomes admin, all others are regular users
            const clerkAdminCount = await prismadb.user.count({
                where: {
                    isAdmin: true,
                    clerkId: { not: 'service-admin' } // Only count real Clerk users
                }
            });
            const shouldBeAdmin = clerkAdminCount === 0; // First user becomes admin

            console.log('[ADMIN_CHECK] Clerk admin count:', clerkAdminCount, 'Should be admin:', shouldBeAdmin);

            if (!user) {
                console.log('[ADMIN_CHECK] User not found, creating new user for clerkId:', clerkUserId, 'email:', clerkUserEmail, 'Will be admin:', shouldBeAdmin);
                try {
                    user = await prismadb.user.create({
                        data: {
                            clerkId: clerkUserId,
                            email: clerkUserEmail,
                            name: clerkUserName,
                            isAdmin: shouldBeAdmin, // First user = admin, rest = false
                        },
                    });
                    console.log('[ADMIN_CHECK] User created with isAdmin:', user.isAdmin, 'email:', user.email);
                } catch (createError: any) {
                    // Handle unique constraint errors
                    if (createError.code === 'P2002') {
                        console.log('[ADMIN_CHECK] Unique constraint error, target:', createError.meta?.target);

                        // Check if it's a clerkId conflict (most common case)
                        if (createError.meta?.target?.includes('clerkId')) {
                            // User with this clerkId already exists - fetch it
                            user = await prismadb.user.findUnique({
                                where: { clerkId: clerkUserId },
                            });
                            if (user) {
                                console.log('[ADMIN_CHECK] Found existing user by clerkId:', user.email);
                            }
                        }
                        // Check if it's an email conflict
                        else if (createError.meta?.target?.includes('email')) {
                            // User with this email already exists
                            const existingUser = await prismadb.user.findUnique({
                                where: { email: clerkUserEmail },
                            });

                            if (existingUser) {
                                // If existing user has the same clerkId, use it
                                if (existingUser.clerkId === clerkUserId) {
                                    user = existingUser;
                                    console.log('[ADMIN_CHECK] Found existing user with matching clerkId:', user.email);
                                }
                                // If existing user has a different clerkId, this is a different user
                                // Create with a unique email (shouldn't happen in Clerk, but handle it)
                                else {
                                    console.log('[ADMIN_CHECK] Email conflict: existing user has different clerkId. Creating with unique email.');
                                    try {
                                        user = await prismadb.user.create({
                                            data: {
                                                clerkId: clerkUserId,
                                                email: `${clerkUserId}@clerk.local`, // Use unique email based on clerkId
                                                name: clerkUserName,
                                                isAdmin: shouldBeAdmin, // First user = admin, rest = false
                                            },
                                        });
                                        console.log('[ADMIN_CHECK] User created with unique email:', user.email, 'isAdmin:', user.isAdmin);
                                    } catch (retryError: any) {
                                        console.error('[ADMIN_CHECK] Failed to create user with unique email:', retryError);
                                        // Final fallback: try finding by clerkId
                                        user = await prismadb.user.findUnique({
                                            where: { clerkId: clerkUserId },
                                        });
                                    }
                                }
                            } else {
                                // Email conflict but user not found - try finding by clerkId as fallback
                                user = await prismadb.user.findUnique({
                                    where: { clerkId: clerkUserId },
                                });
                            }
                        }

                        // Final fallback: try to find by clerkId one more time
                        if (!user) {
                            console.log('[ADMIN_CHECK] User not found after conflict, fetching by clerkId...');
                            user = await prismadb.user.findUnique({
                                where: { clerkId: clerkUserId },
                            });
                        }

                        if (!user) {
                            console.error('[ADMIN_CHECK] Failed to create or find user after conflict:', createError);
                            // Try one more time with a unique email based on clerkId
                            try {
                                user = await prismadb.user.create({
                                    data: {
                                        clerkId: clerkUserId,
                                        email: `${clerkUserId}@clerk.local`,
                                        name: clerkUserName,
                                        isAdmin: shouldBeAdmin, // First user = admin, rest = false
                                    },
                                });
                                console.log('[ADMIN_CHECK] User created with fallback email:', user.email, 'isAdmin:', user.isAdmin);
                            } catch (fallbackError: any) {
                                console.error('[ADMIN_CHECK] Fallback user creation also failed:', fallbackError);
                            }
                        }
                    } else {
                        // Re-throw non-unique-constraint errors
                        console.error('[ADMIN_CHECK] Unexpected error creating user:', createError);
                        throw createError;
                    }
                }
            } else {
                console.log('[ADMIN_CHECK] User already exists in database:', user.email, 'clerkId:', user.clerkId);
                // Update email and name if they're still using temp values
                if (user.email.includes('@temp.local') || user.email.includes('@clerk.local') || user.name === 'New User') {
                    try {
                        user = await prismadb.user.update({
                            where: { clerkId: clerkUserId },
                            data: {
                                email: clerkUserEmail,
                                name: clerkUserName,
                            },
                        });
                        console.log('[ADMIN_CHECK] Updated user email/name:', user.email, user.name);
                    } catch (updateError: any) {
                        // If email update fails due to conflict, that's okay - user already has an email
                        if (updateError.code === 'P2002') {
                            console.log('[ADMIN_CHECK] Email already exists, skipping update');
                        } else {
                            console.log('[ADMIN_CHECK] Could not update user email/name:', updateError);
                        }
                    }
                }
            }

            // Log admin status (no promotion - admin is only set during creation)
            if (user && user.isAdmin) {
                console.log('[ADMIN_CHECK] User is admin');
            } else if (user) {
                console.log('[ADMIN_CHECK] User is not admin');
            }

            if (!user) {
                console.log('[ADMIN_CHECK] User not found after processing');
                return NextResponse.json({ isAdmin: false, user: null });
            }

            console.log('[ADMIN_CHECK] Returning isAdmin:', user.isAdmin, 'for user:', user.email);
            // Check if user has any saloons
            const saloonsCount = await prismadb.saloon.count({
                where: { userId: user.id }
            });

            console.log('[ADMIN_CHECK] Returning isAdmin:', user.isAdmin, 'hasSaloons:', saloonsCount > 0);
            return NextResponse.json({
                isAdmin: user.isAdmin,
                hasSaloons: saloonsCount > 0,
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

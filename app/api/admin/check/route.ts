import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { checkAdminAccess } from "@/lib/admin-access";
import { currentUser } from "@clerk/nextjs";
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
                // Get user details from Clerk to get real email
                let clerkUserEmail = `${clerkUserId}@temp.local`;
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

                // Check admin count BEFORE creating user to avoid race conditions
                // Exclude service-admin user from count (only count real Clerk users)
                const adminCount = await prismadb.user.count({ 
                    where: { 
                        isAdmin: true,
                        clerkId: { not: 'service-admin' } // Exclude synthetic service user
                    } 
                });
                
                // If no admins exist (excluding service-admin), this user should be admin
                const shouldPromoteToAdmin = adminCount === 0;

                console.log('[ADMIN_CHECK] Admin count (excluding service-admin):', adminCount, 'Should promote:', shouldPromoteToAdmin);

                if (!user) {
                    console.log('[ADMIN_CHECK] User not found, creating new user for clerkId:', clerkUserId, 'email:', clerkUserEmail, 'Will promote to admin:', shouldPromoteToAdmin);
                    try {
                        user = await prismadb.user.create({
                            data: {
                                clerkId: clerkUserId,
                                email: clerkUserEmail,
                                name: clerkUserName,
                                isAdmin: shouldPromoteToAdmin, // Set admin flag during creation
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
                                        // Recalculate admin count before creating (in case another user was created)
                                        const retryAdminCount = await prismadb.user.count({ 
                                            where: { 
                                                isAdmin: true,
                                                clerkId: { not: 'service-admin' } // Exclude synthetic service user
                                            } 
                                        });
                                        const retryShouldPromote = retryAdminCount === 0;
                                        console.log('[ADMIN_CHECK] Recalculated admin count for retry:', retryAdminCount, 'Should promote:', retryShouldPromote);
                                        
                                        try {
                                            user = await prismadb.user.create({
                                                data: {
                                                    clerkId: clerkUserId,
                                                    email: `${clerkUserId}@clerk.local`, // Use unique email based on clerkId
                                                    name: clerkUserName,
                                                    isAdmin: retryShouldPromote,
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
                                // Recalculate admin count before fallback creation (in case another user was created)
                                const fallbackAdminCount = await prismadb.user.count({ 
                                    where: { 
                                        isAdmin: true,
                                        clerkId: { not: 'service-admin' } // Exclude synthetic service user
                                    } 
                                });
                                const fallbackShouldPromote = fallbackAdminCount === 0;
                                console.log('[ADMIN_CHECK] Recalculated admin count for fallback:', fallbackAdminCount, 'Should promote:', fallbackShouldPromote);
                                
                                // Try one more time with a unique email based on clerkId
                                try {
                                    user = await prismadb.user.create({
                                        data: {
                                            clerkId: clerkUserId,
                                            email: `${clerkUserId}@clerk.local`,
                                            name: clerkUserName,
                                            isAdmin: fallbackShouldPromote,
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
                    if (user.email.includes('@temp.local') || user.name === 'New User') {
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

                // If user exists but wasn't promoted, check if they should be promoted
                if (user && !user.isAdmin) {
                    // Recalculate admin count (excluding service-admin) to handle existing users
                    const currentAdminCount = await prismadb.user.count({ 
                        where: { 
                            isAdmin: true,
                            clerkId: { not: 'service-admin' } // Exclude synthetic service user
                        } 
                    });
                    
                    if (currentAdminCount === 0) {
                        console.log('[ADMIN_CHECK] Promoting existing user to admin (no Clerk admins exist)');
                        try {
                            user = await prismadb.user.update({
                                where: { id: user.id },
                                data: { isAdmin: true },
                            });
                            console.log('[ADMIN_CHECK] Successfully promoted user to admin');
                        } catch (updateError: any) {
                            console.error('[ADMIN_CHECK] Failed to promote user:', updateError);
                            // Refetch user to get current state
                            user = await prismadb.user.findUnique({
                                where: { clerkId: clerkUserId },
                            });
                        }
                    } else {
                        console.log('[ADMIN_CHECK] Admin already exists, user is not admin');
                    }
                } else if (user && user.isAdmin) {
                    console.log('[ADMIN_CHECK] User is already admin');
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

        // Fallback: check bearer token (service admin) only if no Clerk token was present at all
        // If a Clerk token was present but invalid/missing user, we should return false, not fall back
        if (!clerkToken) {
            const { isAdmin: bearerAdmin, user: bearerUser } = await checkAdminAccess();
            if (bearerAdmin && bearerUser) {
                console.log('[ADMIN_CHECK] Returning bearer token admin');
                return NextResponse.json({ 
                    isAdmin: true, 
                    user: { id: bearerUser.id, name: bearerUser.name, email: bearerUser.email } 
                });
            }
        }

        // No valid auth found or Clerk token was present but user is not admin
        console.log('[ADMIN_CHECK] No valid admin access found');
        return NextResponse.json({ isAdmin: false, user: null });
    } catch (error) {
        console.log('[ADMIN_CHECK]', error);
        return NextResponse.json({ isAdmin: false, user: null });
    }
}

export const runtime = "nodejs";

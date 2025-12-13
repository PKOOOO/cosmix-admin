import { ensureServiceUser, isAuthorizedRequest } from "./service-auth";
import { auth, currentUser } from "@clerk/nextjs";
import { headers, cookies } from "next/headers";
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

export async function checkAdminAccess() {
  // Check for bearer token authentication first (from WebView)
  const isAuthorized = isAuthorizedRequest();
  let clerkUserId: string | null = null;

  console.log('[ADMIN_ACCESS] Starting checkAdminAccess, isAuthorized:', isAuthorized);

  if (isAuthorized) {
    // Extract Clerk user ID from X-User-Token header
    const headerPayload = headers();
    const clerkToken = headerPayload.get("x-user-token");

    console.log('[ADMIN_ACCESS] Bearer token present, X-User-Token header:', !!clerkToken);

    if (clerkToken) {
      const decoded = decodeJWT(clerkToken);
      clerkUserId = decoded?.sub || null;
      console.log('[ADMIN_ACCESS] Clerk userId from X-User-Token header:', clerkUserId);
    }
  }

  // Check cookie if header was lost (common during navigation)
  if (!clerkUserId) {
    try {
      const cookieStore = cookies();
      const cookieToken = cookieStore.get("x-user-token-session")?.value;
      if (cookieToken) {
        const decoded = decodeJWT(cookieToken);
        clerkUserId = decoded?.sub || null;
        console.log('[ADMIN_ACCESS] Clerk userId from cookie:', clerkUserId);
      }
    } catch (error) {
      console.log('[ADMIN_ACCESS] Error reading cookie:', error);
    }
  }

  // Fall back to Clerk auth if no clerkUserId found yet
  if (!clerkUserId) {
    try {
      const clerkAuth = auth();
      clerkUserId = clerkAuth?.userId || null;
      console.log('[ADMIN_ACCESS] Clerk userId from Clerk auth():', clerkUserId);
    } catch (error) {
      console.log('[ADMIN_ACCESS] Clerk auth() failed:', error);
    }
  }

  // If no user ID found, check if it's a service-admin request (bearer token only, no Clerk)
  if (!clerkUserId && isAuthorized) {
    // This is a bearer token request without Clerk authentication - use service-admin
    console.log('[ADMIN_ACCESS] No Clerk user found, using service-admin for bearer token request');
    const user = await ensureServiceUser();
    return { isAdmin: true, user };
  }

  // If no user ID found and not a bearer token request, deny access
  if (!clerkUserId) {
    console.log('[ADMIN_ACCESS] No user ID found, denying access');
    return { isAdmin: false, user: null };
  }

  console.log('[ADMIN_ACCESS] Found Clerk userId:', clerkUserId);

  // Check admin status for the Clerk user
  try {

    // Check admin count BEFORE creating user to avoid race conditions
    // Exclude service-admin user from count (only count real Clerk users)
    const adminCount = await prismadb.user.count({
      where: {
        isAdmin: true,
        clerkId: { not: 'service-admin' } // Exclude synthetic service user
      }
    });
    const shouldPromoteToAdmin = adminCount === 0;

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
      console.log('[ADMIN_ACCESS] Could not fetch Clerk user details:', error);
    }

    // Find or create the Clerk user in DB
    let user = await prismadb.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!user) {
      try {
        user = await prismadb.user.create({
          data: {
            clerkId: clerkUserId,
            email: clerkUserEmail,
            name: clerkUserName,
            isAdmin: shouldPromoteToAdmin, // Set admin flag during creation
          },
        });
        console.log('[ADMIN_ACCESS] User created with isAdmin:', user.isAdmin, 'email:', user.email);
      } catch (createError: any) {
        // Handle unique constraint errors
        if (createError.code === 'P2002') {
          console.log('[ADMIN_ACCESS] Unique constraint error, target:', createError.meta?.target);

          // Check if it's a clerkId conflict (most common case)
          if (createError.meta?.target?.includes('clerkId')) {
            // User with this clerkId already exists - fetch it
            user = await prismadb.user.findUnique({
              where: { clerkId: clerkUserId },
            });
            if (user) {
              console.log('[ADMIN_ACCESS] Found existing user by clerkId:', user.email);
            }
          }
          // Check if it's an email conflict
          else if (createError.meta?.target?.includes('email')) {
            // User with this email already exists, try to find by email and update clerkId
            const existingUser = await prismadb.user.findUnique({
              where: { email: clerkUserEmail },
            });

            if (existingUser) {
              // If existing user doesn't have a clerkId, update it
              if (!existingUser.clerkId) {
                user = await prismadb.user.update({
                  where: { email: clerkUserEmail },
                  data: {
                    clerkId: clerkUserId,
                    name: clerkUserName,
                    // Don't change isAdmin if user already exists
                  },
                });
                console.log('[ADMIN_ACCESS] Linked existing user to Clerk ID:', clerkUserId);
              } else {
                // User already has a clerkId, just use it
                user = existingUser;
                console.log('[ADMIN_ACCESS] Using existing user with different clerkId');
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
            user = await prismadb.user.findUnique({
              where: { clerkId: clerkUserId },
            });
          }

          if (!user) {
            console.error('[ADMIN_ACCESS] Failed to create or find user after conflict:', createError);
            return { isAdmin: false, user: null };
          }
        } else {
          // Re-throw non-unique-constraint errors
          console.error('[ADMIN_ACCESS] Unexpected error creating user:', createError);
          throw createError;
        }
      }
    }

    // Log admin status (no promotion - admin is only set during creation)
    if (user && user.isAdmin) {
      console.log('[ADMIN_ACCESS] User is admin');
    } else if (user) {
      console.log('[ADMIN_ACCESS] User is not admin');
    }

    console.log('[ADMIN_ACCESS] Returning isAdmin:', user?.isAdmin, 'for user:', user?.email);
    return { isAdmin: user?.isAdmin || false, user: user || null };
  } catch (error) {
    console.error("Error checking admin access:", error);
    return { isAdmin: false, user: null };
  }
}

export async function requireAdmin() {
  const { isAdmin, user } = await checkAdminAccess();

  if (!isAdmin) {
    throw new Error("Admin access required");
  }

  return user;
}

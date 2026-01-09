import { ensureServiceUser, isAuthorizedRequest } from "./service-auth";
import { auth, currentUser } from "@clerk/nextjs";
import { verifyToken } from "@clerk/backend";
import { headers, cookies } from "next/headers";
import prismadb from "@/lib/prismadb";

/**
 * SECURITY NOTE: We do NOT decode JWT tokens manually anymore.
 * Previously we had a decodeJWT function that decoded tokens without signature verification,
 * which allowed anyone to forge tokens and create fake users in the database.
 * 
 * Now we ONLY trust:
 * 1. Clerk's verifyToken() from @clerk/backend to verify tokens from WebView headers (PRIORITY)
 * 2. Clerk's auth() function for browser session cookies (FALLBACK)
 * 3. Service-admin for bearer-token-only requests (API access) - ONLY if no x-user-token was provided
 */

/**
 * Verify a Clerk JWT token using Clerk's backend API
 * This ensures the token is actually signed by Clerk and not forged
 */
async function verifyClerkToken(token: string): Promise<string | null> {
  try {
    // Use Clerk's verifyToken to validate the JWT
    // This checks the signature, expiration, etc.
    // Requires CLERK_SECRET_KEY env var to be set
    // Get issuer from env or construct from publishable key
    const issuer = process.env.CLERK_JWT_ISSUER ||
      (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.includes('pk_test_')
        ? `https://${process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.replace('pk_test_', '').replace('$', '')}.clerk.accounts.dev`
        : null);

    const verifiedToken = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
      issuer: issuer,
      clockSkewInMs: 300000, // Allow 5 minutes of clock skew for network latency
    });

    if (verifiedToken && verifiedToken.sub) {
      console.log('[ADMIN_ACCESS] Token verified successfully, userId:', verifiedToken.sub);
      return verifiedToken.sub;
    }

    console.log('[ADMIN_ACCESS] Token verification returned no userId');
    return null;
  } catch (error: any) {
    console.log('[ADMIN_ACCESS] Token verification failed:', error?.message || error);
    return null;
  }
}

export async function checkAdminAccess() {
  // Check for bearer token authentication first (from WebView)
  const isAuthorized = isAuthorizedRequest();
  let clerkUserId: string | null = null;
  let isTokenVerified = false;
  let hadUserToken = false; // Track if x-user-token was provided (even if invalid)

  console.log('[ADMIN_ACCESS] Starting checkAdminAccess, isAuthorized:', isAuthorized);

  // Check for x-user-token in headers or cookies FIRST
  // This takes priority because WebView auth uses custom tokens, not Clerk session cookies
  const headerPayload = headers();
  const headerToken = headerPayload.get("x-user-token");

  let cookieToken: string | null = null;
  try {
    const cookieStore = cookies();
    cookieToken = cookieStore.get("x-user-token-session")?.value || null;
  } catch (error) {
    console.log('[ADMIN_ACCESS] Error reading cookie:', error);
  }

  // PRIORITY 1: Verify x-user-token from header (WebView first load)
  if (headerToken) {
    console.log('[ADMIN_ACCESS] Found x-user-token header, verifying...');
    hadUserToken = true;
    clerkUserId = await verifyClerkToken(headerToken);
    if (clerkUserId) {
      isTokenVerified = true;
    }
  }

  // PRIORITY 2: Verify x-user-token-session cookie (WebView navigation)
  if (!clerkUserId && cookieToken) {
    console.log('[ADMIN_ACCESS] Found x-user-token-session cookie, verifying...');
    hadUserToken = true;
    clerkUserId = await verifyClerkToken(cookieToken);
    if (clerkUserId) {
      isTokenVerified = true;
      console.log('[ADMIN_ACCESS] Clerk userId from verified cookie token:', clerkUserId);
    }
  }

  // PRIORITY 3: Try Clerk's built-in auth() only if NO x-user-token was provided
  // This is for browser-based sessions, not WebView
  // NOTE: We skip this if hadUserToken is true because auth() can return stale/wrong values
  if (!clerkUserId && !hadUserToken) {
    try {
      const clerkAuth = auth();
      // SECURITY: Never accept "service-admin" from auth() - it's our synthetic user
      if (clerkAuth?.userId && clerkAuth.userId !== 'service-admin') {
        clerkUserId = clerkAuth.userId;
        isTokenVerified = true;
        console.log('[ADMIN_ACCESS] Clerk userId from Clerk auth():', clerkUserId);
      }
    } catch (error) {
      console.log('[ADMIN_ACCESS] Clerk auth() failed:', error);
    }
  }

  // SECURITY: If a user token was provided but verification failed, DENY ACCESS
  // Do NOT fall back to service-admin - this prevents fake token attacks
  if (hadUserToken && !clerkUserId) {
    console.log('[ADMIN_ACCESS] SECURITY: x-user-token was provided but verification failed. Denying access.');
    return { isAdmin: false, user: null };
  }

  // If no user ID found, check if it's a service-admin request (bearer token only, no Clerk)
  // This is for API-only access (like the mobile app calling APIs)
  // ONLY allow this if NO x-user-token was provided at all
  if (!clerkUserId && isAuthorized && !hadUserToken) {
    // This is a bearer token request without any user token - use service-admin
    console.log('[ADMIN_ACCESS] No user token provided, using service-admin for bearer token request');
    const user = await ensureServiceUser();
    return { isAdmin: true, user };
  }

  // If no user ID found and not a bearer token request, deny access
  if (!clerkUserId) {
    console.log('[ADMIN_ACCESS] No user ID found, denying access');
    return { isAdmin: false, user: null };
  }

  // SECURITY CHECK: Only proceed if the token was properly verified
  if (!isTokenVerified) {
    console.log('[ADMIN_ACCESS] SECURITY: Token was not verified, denying access');
    return { isAdmin: false, user: null };
  }

  console.log('[ADMIN_ACCESS] Found verified Clerk userId:', clerkUserId);

  // Check admin status for the Clerk user
  try {
    // First, check if user already exists in database
    let user = await prismadb.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    // If user doesn't exist, we need to CREATE them
    // But ONLY if we have verified credentials from Clerk
    if (!user) {
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
        console.log('[ADMIN_ACCESS] Could not fetch Clerk user details:', error);
      }

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

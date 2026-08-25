import { ADMIN_EXTERNAL_ID, ensureServiceUser, isAuthorizedRequest } from "./service-auth";
import { verifyToken } from "@clerk/backend";
import { headers, cookies } from "next/headers";
import { getOrCreateUserFromClerk } from "./get-or-create-user";

/**
 * SECURITY NOTE: We do NOT decode JWT tokens manually anymore.
 * Previously we had a decodeJWT function that decoded tokens without signature verification,
 * which allowed anyone to forge tokens and create fake users in the database.
 * 
 * Now we ONLY trust:
 * 1. Clerk's verifyToken() from @clerk/backend to verify tokens from WebView headers (PRIORITY)
 * 2. Service-admin for bearer-token-only requests (API access) - ONLY if no x-user-token was provided
 *
 * There is no browser-session path. Clerk's auth() used to serve as a fallback
 * here, but this app has no Clerk browser sessions and no Clerk authMiddleware,
 * so auth() could only ever throw.
 */

/**
 * Verify a Clerk JWT token using Clerk's backend API
 * This ensures the token is actually signed by Clerk and not forged
 */
async function verifyClerkToken(token: string): Promise<string | null> {
  try {
    // Use Clerk's verifyToken to validate the JWT.
    // Issuer is derived automatically from CLERK_SECRET_KEY in @clerk/backend v1+.
    const verifiedToken = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
      clockSkewInMs: 300000, // 5 minutes for network latency
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

  // PRIORITY 3: Authorization Bearer header as Clerk JWT (native mobile clients)
  // Runs when no x-user-token is present — mobile sends Clerk JWT directly as Bearer
  if (!clerkUserId && !hadUserToken) {
    const adminApiKey = process.env.ADMIN_API_KEY || '';
    const bearerRaw = headerPayload.get('authorization') ?? '';
    const bearerToken = bearerRaw.startsWith('Bearer ') ? bearerRaw.slice(7).trim() : '';
    if (bearerToken && bearerToken !== adminApiKey && bearerToken.split('.').length === 3) {
      console.log('[ADMIN_ACCESS] Found Clerk JWT in Authorization Bearer, verifying...');
      hadUserToken = true;
      clerkUserId = await verifyClerkToken(bearerToken);
      if (clerkUserId) {
        isTokenVerified = true;
        console.log('[ADMIN_ACCESS] Clerk userId from Bearer JWT:', clerkUserId);
      }
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

  try {
    const user = await getOrCreateUserFromClerk(clerkUserId);
    if (!user) {
      console.log('[ADMIN_ACCESS] getOrCreateUserFromClerk returned null');
      return { isAdmin: false, user: null };
    }
    console.log('[ADMIN_ACCESS] Returning isAdmin:', user.isAdmin, 'for user:', user.email);
    return { isAdmin: user.isAdmin, user };
  } catch (error) {
    console.error("Error checking admin access:", error);
    return { isAdmin: false, user: null };
  }
}

/**
 * Resolve the request to a REAL end user (customer or provider), never the
 * synthetic service user.
 *
 * checkAdminAccess() falls back to `service-admin` for bearer-token-only
 * requests, which is right for shared/anonymous data (e.g. anonymous checkout)
 * but wrong for anything owned by one specific human: the bearer key ships
 * inside the Expo bundle, so that fallback would let any holder of it write to
 * the shared service row. Use this for per-user writes such as push tokens.
 *
 * Returns null when only the bearer key was presented, or when no verified
 * Clerk user could be resolved.
 */
export async function getEndUser() {
  const { user } = await checkAdminAccess();
  if (!user || user.clerkId === ADMIN_EXTERNAL_ID) return null;
  return user;
}

export async function requireAdmin() {
  const { isAdmin, user } = await checkAdminAccess();

  if (!isAdmin) {
    throw new Error("Admin access required");
  }

  return user;
}

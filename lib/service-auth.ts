import { cookies, headers } from "next/headers";
import { NextRequest } from "next/server";
import prismadb from "./prismadb";

// Shared secret for server-to-server calls (set in env)
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "dev-admin-key-change-me";

// Synthetic user identifiers (reuse existing schema field to avoid migrations)
export const ADMIN_EXTERNAL_ID = process.env.ADMIN_EXTERNAL_ID || "service-admin";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@cosmix.local";

const extractToken = (authHeader?: string | null) => {
  if (!authHeader) return null;
  const [type, token] = authHeader.split(" ");
  if (type?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
};

export const getTokenFromRequest = (req?: NextRequest) => {
  if (req) {
    const tokenFromHeader = extractToken(req.headers.get("authorization"));
    if (tokenFromHeader) return tokenFromHeader;
    const cookieToken = req.cookies.get("admin_token")?.value;
    return cookieToken || null;
  }

  const tokenFromHeader = extractToken(headers().get("authorization"));
  if (tokenFromHeader) return tokenFromHeader;
  const cookieToken = cookies().get("admin_token")?.value;
  return cookieToken || null;
};

export const isAuthorizedRequest = (req?: NextRequest) => {
  const token = getTokenFromRequest(req);
  return !!token && token === ADMIN_API_KEY;
};

// Fallback address for the service row when ADMIN_EMAIL is unusable.
const SERVICE_FALLBACK_EMAIL = `service-${ADMIN_EXTERNAL_ID}@cosmix.local`;

// Clerk mints user ids as `user_<id>`. Any row carrying one belongs to a real
// human and must never be repurposed as the synthetic service user.
const isRealClerkUser = (clerkId: string) => clerkId.startsWith("user_");

const createServiceUser = (email: string) =>
  prismadb.user.create({
    data: {
      clerkId: ADMIN_EXTERNAL_ID,
      email,
      name: "Service User",
      isAdmin: false, // Service user is NOT an admin
    },
  });

// Ensure there is at least one service user record to attach data to
// Note: This user is NOT an admin - it's just a system user for bearer token auth
export const ensureServiceUser = async () => {
  const existing = await prismadb.user.findUnique({
    where: { clerkId: ADMIN_EXTERNAL_ID },
  });

  if (existing) {
    // If service-admin was previously set as admin, update it to non-admin
    if (existing.isAdmin) {
      return prismadb.user.update({
        where: { clerkId: ADMIN_EXTERNAL_ID },
        data: { isAdmin: false },
      });
    }
    return existing;
  }

  // `email` is @unique, so creating the service row under ADMIN_EMAIL collides
  // whenever a real user already holds that address. Claiming their row (the
  // old behaviour) rewrote their clerkId to ADMIN_EXTERNAL_ID, which orphans
  // their Clerk identity: getOrCreateUserFromClerk then hits the same unique
  // email conflict, returns null, and every authenticated request from that
  // account 401s. Resolve the collision up front instead of on P2002.
  const holder = await prismadb.user.findUnique({ where: { email: ADMIN_EMAIL } });

  if (holder && isRealClerkUser(holder.clerkId)) {
    console.error(
      `[service-auth] ADMIN_EMAIL (${ADMIN_EMAIL}) belongs to Clerk user ${holder.clerkId}. ` +
      `Refusing to claim their row; using ${SERVICE_FALLBACK_EMAIL} instead. ` +
      `Set ADMIN_EMAIL to a synthetic address that no real user can register.`
    );
  }

  // Only a legacy synthetic row (no Clerk identity) may be converted in place.
  if (holder && !isRealClerkUser(holder.clerkId)) {
    return prismadb.user.update({
      where: { email: ADMIN_EMAIL },
      data: {
        clerkId: ADMIN_EXTERNAL_ID,
        isAdmin: false, // Ensure it's not admin
      },
    });
  }

  const email = holder ? SERVICE_FALLBACK_EMAIL : ADMIN_EMAIL;

  try {
    return await createServiceUser(email);
  } catch (error: any) {
    // Concurrent request won the race, or the fallback address is taken too.
    if (error.code === "P2002") {
      const raced = await prismadb.user.findUnique({
        where: { clerkId: ADMIN_EXTERNAL_ID },
      });
      if (raced) return raced;
    }
    throw error;
  }
};

export const getServiceUser = async (req?: NextRequest) => {
  if (!isAuthorizedRequest(req)) return null;
  return ensureServiceUser();
};

export const requireServiceUser = async (req?: NextRequest) => {
  const user = await getServiceUser(req);
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
};


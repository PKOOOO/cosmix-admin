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

// Ensure there is at least one service user record to attach data to
// Note: This user is NOT an admin - it's just a system user for bearer token auth
export const ensureServiceUser = async () => {
  let user = await prismadb.user.findUnique({
    where: { clerkId: ADMIN_EXTERNAL_ID },
  });

  if (!user) {
    user = await prismadb.user.create({
      data: {
        clerkId: ADMIN_EXTERNAL_ID,
        email: ADMIN_EMAIL,
        name: "Service User",
        isAdmin: false, // Service user is NOT an admin
      },
    });
  } else if (user.isAdmin) {
    // If service-admin was previously set as admin, update it to non-admin
    user = await prismadb.user.update({
      where: { clerkId: ADMIN_EXTERNAL_ID },
      data: { isAdmin: false },
    });
  }

  return user;
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


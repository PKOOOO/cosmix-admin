import { createClerkClient } from "@clerk/backend";
import prismadb from "@/lib/prismadb";

/**
 * Single source of truth for materialising a Clerk user in our DB.
 *
 * - Fetches the real email + name from Clerk via server-to-server API
 *   (works in WebView and Bearer-JWT contexts where `currentUser()` returns null).
 * - Auto-promotes the first non-service-admin user to admin.
 * - Self-heals rows whose stored email matches the synthetic `<clerkId>@clerk.local`
 *   pattern from before this helper existed.
 *
 * Returns null for the synthetic `service-admin` clerkId (handled separately
 * by `ensureServiceUser` in lib/service-auth.ts).
 */
export async function getOrCreateUserFromClerk(clerkUserId: string) {
  if (clerkUserId === "service-admin") return null;

  if (!process.env.CLERK_SECRET_KEY) {
    console.error("[Auth] CLERK_SECRET_KEY missing — cannot fetch user details from Clerk");
  }

  const clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY ?? "",
  });

  let clerkUserEmail = `${clerkUserId}@clerk.local`;
  let clerkUserName = "New User";
  let fetchedFromClerk = false;

  try {
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    if (clerkUser) {
      const realEmail = clerkUser.emailAddresses[0]?.emailAddress;
      if (realEmail) {
        clerkUserEmail = realEmail;
        fetchedFromClerk = true;
      }
      clerkUserName =
        `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() ||
        clerkUser.username ||
        clerkUserEmail;
    }
  } catch (err) {
    console.error("[Clerk] Failed to fetch user:", clerkUserId, err);
  }

  // First-non-service user becomes admin
  const adminCount = await prismadb.user.count({
    where: { isAdmin: true, clerkId: { not: "service-admin" } },
  });
  const shouldBeAdmin = adminCount === 0;

  // Self-heal: only overwrite stored email/name when we actually got real values from Clerk.
  // Otherwise leave the existing row untouched (don't clobber real data with synthetic fallback).
  const updateData = fetchedFromClerk
    ? { email: clerkUserEmail, name: clerkUserName }
    : {};

  try {
    const user = await prismadb.user.upsert({
      where: { clerkId: clerkUserId },
      update: updateData,
      create: {
        clerkId: clerkUserId,
        email: clerkUserEmail,
        name: clerkUserName,
        isAdmin: shouldBeAdmin,
      },
    });

    if (shouldBeAdmin && user.isAdmin) {
      console.log("[Auth] First user promoted to admin:", clerkUserEmail);
    }

    return user;
  } catch (err: any) {
    // Most common case: another concurrent request created the row, or there's a row
    // with the same email but a different clerkId. Fall back to lookup-by-clerkId.
    if (err?.code === "P2002") {
      console.log("[Auth] upsert conflict on:", err.meta?.target);
      const fallback = await prismadb.user.findUnique({ where: { clerkId: clerkUserId } });
      if (fallback) return fallback;
    }
    console.error("[Auth] upsert failed:", err);
    return null;
  }
}

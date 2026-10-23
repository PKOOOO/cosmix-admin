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
  let emailVerified = false;

  try {
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    if (clerkUser) {
      const firstEmail = clerkUser.emailAddresses[0];
      const realEmail = firstEmail?.emailAddress;
      if (realEmail) {
        clerkUserEmail = realEmail;
        fetchedFromClerk = true;
        emailVerified = firstEmail.verification?.status === "verified";
      }
      clerkUserName =
        `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() ||
        clerkUser.username ||
        clerkUserEmail;
    }
  } catch (err) {
    console.error("[Clerk] Failed to fetch user:", clerkUserId, err);
  }

  // Re-link by verified email. Moving to the Clerk production instance (Oct 2026)
  // gave every user a new Clerk ID, and guest checkout creates `temp_…` rows that
  // carry a real email. In both cases the upsert below would hit the unique email
  // constraint and 401 the user. If no row has this clerkId but one has the same
  // *verified* email, it's the same person: move that row to the new Clerk ID so
  // bookings, salons and roles (all keyed on User.id) carry over. Never re-key
  // the synthetic service user.
  if (fetchedFromClerk && emailVerified) {
    const existing = await prismadb.user.findUnique({ where: { clerkId: clerkUserId } });
    if (!existing) {
      const byEmail = await prismadb.user.findUnique({ where: { email: clerkUserEmail } });
      if (byEmail && byEmail.clerkId !== "service-admin") {
        console.log("[Auth] Re-linked user row to new Clerk ID:", byEmail.id);
        return prismadb.user.update({
          where: { id: byEmail.id },
          data: { clerkId: clerkUserId, name: clerkUserName },
        });
      }
    }
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

// One-time DB + Clerk cleanup. Keeps only isAdmin=true users.
// Usage:
//   node --env-file=.env scripts/cleanup-users.mjs --dry-run   (no writes, just lists)
//   node --env-file=.env scripts/cleanup-users.mjs             (destructive — waits 5s before deleting)
//
// Requires env: DATABASE_URL, CLERK_SECRET_KEY, (optional STRIPE_SECRET_KEY)

import { PrismaClient } from "@prisma/client";
import { createClerkClient } from "@clerk/backend";

const DRY_RUN = process.argv.includes("--dry-run");
const SKIP_CLERK = process.argv.includes("--skip-clerk");
const SKIP_STRIPE = process.argv.includes("--skip-stripe");

// Orphan Stripe Express accounts created before the stripeId column was dropped.
// These are tied to deleted/test users and should be removed permanently from Stripe.
const ORPHAN_STRIPE_ACCOUNT_IDS = [
  "acct_1TbOMDAFFLEiudy3",
  "acct_1TbI1hA3U6HcAxee",
  "acct_1TQXLSAZd0MVUPDi",
  "acct_1TONLiPBuii7wt1l",
  "acct_1TO1lBALHoEVjK47",
  "acct_1TNxsiAU4b5L30JS",
  "acct_1T59S4AavZR530GX",
];

const prisma = new PrismaClient();

const clerk = SKIP_CLERK || !process.env.CLERK_SECRET_KEY
  ? null
  : createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// Stripe is optional — only used if STRIPE_SECRET_KEY is set AND any user still has a stripeId column.
let stripe = null;
if (!SKIP_STRIPE && process.env.STRIPE_SECRET_KEY) {
  try {
    const Stripe = (await import("stripe")).default;
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  } catch (e) {
    console.log("[stripe] not loaded:", e?.message ?? e);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`\n=== cleanup-users.mjs ${DRY_RUN ? "(DRY RUN)" : "(LIVE)"} ===\n`);

  // 1) Identify admins
  const admins = await prisma.user.findMany({
    where: { isAdmin: true },
    select: { id: true, email: true, clerkId: true, name: true },
  });

  if (admins.length === 0) {
    console.error("ABORT: No admin users found. Refusing to delete everyone.");
    process.exit(1);
  }

  console.log("Keeping admin user(s):");
  for (const a of admins) {
    console.log(`  - ${a.email}  (db.id=${a.id}, clerkId=${a.clerkId})`);
  }
  const adminDbIds = new Set(admins.map((a) => a.id));
  const adminClerkIds = new Set(
    admins.map((a) => a.clerkId).filter((cid) => cid && cid !== "service-admin"),
  );

  // 2) Count what will be deleted
  const [nonAdminUsers, bookings, reviews, saloonServices, saloons, applications] = await Promise.all([
    prisma.user.count({ where: { isAdmin: false } }),
    prisma.booking.count(),
    prisma.saloonReview.count(),
    prisma.saloonService.count(),
    prisma.saloon.count(),
    prisma.providerApplication.count(),
  ]);

  console.log("\nDB rows scheduled for deletion:");
  console.log(`  bookings:             ${bookings}`);
  console.log(`  saloon reviews:       ${reviews}`);
  console.log(`  saloon services:      ${saloonServices}`);
  console.log(`  saloons:              ${saloons}  (will cascade to saloon_images + saloon_time_slots)`);
  console.log(`  provider applications: ${applications}`);
  console.log(`  non-admin users:      ${nonAdminUsers}`);

  // 3) Optional: Stripe accounts. With stripeId column dropped this is a no-op,
  //    but kept for forward-compat. Detect via raw query against information_schema.
  const stripeIdColumn = await prisma.$queryRawUnsafe(
    `SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'stripeId' LIMIT 1`,
  );
  let stripeIdsToDelete = [];
  if (stripe) {
    if (stripeIdColumn.length > 0) {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT "stripeId" FROM users WHERE "stripeId" IS NOT NULL AND "isAdmin" = false`,
      );
      stripeIdsToDelete = rows.map((r) => r.stripeId);
    } else {
      // Column dropped — fall back to hardcoded orphan list
      stripeIdsToDelete = [...ORPHAN_STRIPE_ACCOUNT_IDS];
    }
    console.log(`  stripe accounts:      ${stripeIdsToDelete.length} (will permanently delete)`);
  } else {
    console.log(`  stripe accounts:      (skipped — no STRIPE_SECRET_KEY) → ${ORPHAN_STRIPE_ACCOUNT_IDS.length} orphans remain on Stripe`);
  }

  // 4) Clerk
  if (clerk) {
    const clerkUsers = await fetchAllClerkUsers(clerk);
    const toDelete = clerkUsers.filter((u) => !adminClerkIds.has(u.id));
    console.log(`  clerk users:          ${toDelete.length} (of ${clerkUsers.length} total)`);
  } else {
    console.log("  clerk users:          (skipped — no CLERK_SECRET_KEY or --skip-clerk)");
  }

  if (DRY_RUN) {
    console.log("\nDRY RUN complete. Re-run without --dry-run to actually delete.");
    await prisma.$disconnect();
    return;
  }

  // 5) Confirm with 5-second countdown
  console.log("\nAbout to DELETE the rows listed above. Press Ctrl+C to cancel.");
  for (let i = 5; i > 0; i--) {
    process.stdout.write(`  proceeding in ${i}…\r`);
    await sleep(1000);
  }
  console.log("\n");

  // 6) Stripe deletes (best-effort, before DB so we have the IDs)
  if (stripe && stripeIdsToDelete.length > 0) {
    for (const accountId of stripeIdsToDelete) {
      try {
        await stripe.accounts.del(accountId);
        console.log(`[stripe] deleted ${accountId}`);
      } catch (e) {
        console.error(`[stripe] FAILED to delete ${accountId}:`, e?.message ?? e);
      }
    }
  } else if (!stripe) {
    console.log(`[stripe] SKIPPED — set STRIPE_SECRET_KEY in .env to delete ${ORPHAN_STRIPE_ACCOUNT_IDS.length} orphan accounts on Stripe`);
  }

  // 7) DB deletes in FK-safe order. Wrapped per-step in try/catch so a failure doesn't abort everything.
  await del("bookings", () => prisma.booking.deleteMany({}));
  await del("saloon reviews", () => prisma.saloonReview.deleteMany({}));
  await del("saloon services", () => prisma.saloonService.deleteMany({}));
  await del("saloons", () => prisma.saloon.deleteMany({}));
  await del("provider applications", () => prisma.providerApplication.deleteMany({}));
  await del("non-admin users", () =>
    prisma.user.deleteMany({ where: { isAdmin: false } }),
  );

  // 8) Clerk deletes
  if (clerk) {
    const clerkUsers = await fetchAllClerkUsers(clerk);
    let deleted = 0;
    let failed = 0;
    for (const u of clerkUsers) {
      if (adminClerkIds.has(u.id)) continue;
      try {
        await clerk.users.deleteUser(u.id);
        console.log(`[clerk] deleted ${u.id} (${u.emailAddresses?.[0]?.emailAddress ?? "no email"})`);
        deleted++;
      } catch (e) {
        console.error(`[clerk] FAILED to delete ${u.id}:`, e?.message ?? e);
        failed++;
      }
    }
    console.log(`[clerk] done: deleted=${deleted}, failed=${failed}`);
  }

  // 9) Final summary
  const remainingUsers = await prisma.user.count();
  const remainingAdmins = await prisma.user.count({ where: { isAdmin: true } });
  console.log("\n=== summary ===");
  console.log(`db users remaining:  ${remainingUsers} (admins=${remainingAdmins})`);
  console.log("Note: any admin DB ids that match adminDbIds set:", admins.every((a) => adminDbIds.has(a.id)));

  await prisma.$disconnect();
}

async function del(label, fn) {
  try {
    const r = await fn();
    console.log(`[db] deleted ${r.count} ${label}`);
  } catch (e) {
    console.error(`[db] FAILED to delete ${label}:`, e?.message ?? e);
  }
}

async function fetchAllClerkUsers(client) {
  const all = [];
  let offset = 0;
  const limit = 100;
  while (true) {
    const page = await client.users.getUserList({ limit, offset });
    const data = Array.isArray(page) ? page : (page.data ?? page);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < limit) break;
    offset += data.length;
  }
  return all;
}

main().catch(async (e) => {
  console.error("fatal:", e);
  await prisma.$disconnect();
  process.exit(1);
});

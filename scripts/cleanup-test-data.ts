// Test-data cleanup: keep only the admin + one provider (and their data),
// delete every other user and all their related records.
//
// Usage:
//   node --env-file=.env scripts/cleanup-test-data.ts             (DRY RUN — counts only, no writes)
//   node --env-file=.env scripts/cleanup-test-data.ts --execute   (destructive, single transaction)
//
// Requires env: DATABASE_URL
//
// NOTE: written as ESM/JS-compatible so it runs directly with `node` (matching the
// other scripts in this dir). No TS compilation needed.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const EXECUTE = process.argv.includes("--execute");

const KEEP_EMAILS = ["piusgko@gmail.com", "maxongaro147@gmail.com"];

const line = (label, n) => console.log(`   ${String(n).padStart(4)}  ${label}`);

async function main() {
  console.log(`\n=== cleanup-test-data (${EXECUTE ? "EXECUTE" : "DRY RUN"}) ===\n`);

  // --- Resolve keep / delete users ------------------------------------------
  const allUsers = await prisma.user.findMany({ select: { id: true, email: true, isAdmin: true } });
  const keepUsers = allUsers.filter((u) => KEEP_EMAILS.includes(u.email));
  const delUsers = allUsers.filter((u) => !KEEP_EMAILS.includes(u.email));

  // SAFETY: both keep users must exist, or we abort (never risk deleting everything).
  const missing = KEEP_EMAILS.filter((e) => !keepUsers.some((u) => u.email === e));
  if (missing.length) {
    console.error(`ABORT: keep-user(s) not found in DB: ${missing.join(", ")}`);
    process.exit(1);
  }

  const delUserIds = delUsers.map((u) => u.id);

  // --- Resolve saloons owned by deleted users -------------------------------
  const delSaloons = delUserIds.length
    ? await prisma.saloon.findMany({ where: { userId: { in: delUserIds } }, select: { id: true, name: true } })
    : [];
  const delSaloonIds = delSaloons.map((s) => s.id);

  // Saloon-specific categories owned by deleted saloons (global ones have saloonId=null → untouched).
  const delSaloonCategories = delSaloonIds.length
    ? await prisma.category.findMany({ where: { saloonId: { in: delSaloonIds } }, select: { id: true } })
    : [];
  const delCategoryIds = delSaloonCategories.map((c) => c.id);

  // Services that live under those saloon-specific categories (NOT global catalog).
  const delServices = delCategoryIds.length
    ? await prisma.service.findMany({ where: { categoryId: { in: delCategoryIds } }, select: { id: true } })
    : [];
  const delServiceIds = delServices.map((s) => s.id);

  // --- Count everything the deletion will remove ----------------------------
  const [
    reviewsToDelete,
    bookingsToDelete,
    saloonServicesToDelete,
    timeSlotsToDelete,
    imagesToDelete,
    providerAppsToDelete,
  ] = await Promise.all([
    prisma.saloonReview.count({ where: { OR: [{ userId: { in: delUserIds } }, { saloonId: { in: delSaloonIds } }] } }),
    prisma.booking.count({ where: { OR: [{ userId: { in: delUserIds } }, { saloonId: { in: delSaloonIds } }] } }),
    prisma.saloonService.count({ where: { saloonId: { in: delSaloonIds } } }),
    prisma.saloonTimeSlot.count({ where: { saloonId: { in: delSaloonIds } } }),
    prisma.saloonImage.count({ where: { saloonId: { in: delSaloonIds } } }),
    prisma.providerApplication.count({ where: { userId: { in: delUserIds } } }),
  ]);

  // --- SAFETY: make sure deleted-saloon services aren't used by KEPT data ----
  // If a saloon-specific service of a deleted saloon is referenced by a kept
  // saloon's SaloonService/Booking, deleting it would be wrong — flag & abort.
  let serviceRefConflicts = 0;
  if (delServiceIds.length) {
    const [ssRefs, bkRefs] = await Promise.all([
      prisma.saloonService.count({ where: { serviceId: { in: delServiceIds }, saloonId: { notIn: delSaloonIds } } }),
      prisma.booking.count({ where: { serviceId: { in: delServiceIds }, saloonId: { notIn: delSaloonIds } } }),
    ]);
    serviceRefConflicts = ssRefs + bkRefs;
  }

  // --- Untouched (for context) ----------------------------------------------
  const globalCategories = await prisma.category.count({ where: { saloonId: null } });
  const totalServices = await prisma.service.count();

  // --- Report ---------------------------------------------------------------
  console.log("KEEP users:");
  keepUsers.forEach((u) => console.log(`   • ${u.email}${u.isAdmin ? " (admin)" : ""}`));
  console.log("\nDELETE users:");
  delUsers.forEach((u) => console.log(`   • ${u.email}${u.isAdmin ? " (admin!)" : ""}`));
  console.log("\nDELETE saloons (owned by deleted users):");
  delSaloons.forEach((s) => console.log(`   • ${s.name}`));
  if (!delSaloons.length) console.log("   (none)");

  console.log("\nRows to DELETE (children → parents):");
  line("saloon_reviews", reviewsToDelete);
  line("bookings", bookingsToDelete);
  line("saloon_services", saloonServicesToDelete);
  line("saloon_time_slots", timeSlotsToDelete);
  line("saloon_images", imagesToDelete);
  line("services (saloon-specific only)", delServiceIds.length);
  line("categories (saloon-specific only)", delCategoryIds.length);
  line("provider_applications", providerAppsToDelete);
  line("saloons", delSaloonIds.length);
  line("users", delUserIds.length);

  console.log("\nUNTOUCHED (platform catalog / kept data):");
  line("global categories (saloonId=null)", globalCategories);
  line("services total (incl. global)", totalServices);
  line("kept users", keepUsers.length);

  if (serviceRefConflicts > 0) {
    console.error(
      `\nABORT: ${serviceRefConflicts} saloon-specific service(s) of deleted saloons are still referenced ` +
      `by KEPT saloons' bookings/services. Resolve manually before deleting.`
    );
    process.exit(1);
  }

  if (!EXECUTE) {
    console.log("\nDRY RUN complete. Re-run with --execute to perform the deletion.\n");
    await prisma.$disconnect();
    return;
  }

  // --- Execute: single all-or-nothing transaction, children first -----------
  console.log("\nEXECUTING deletion in a transaction…");
  const ops = [
    prisma.saloonReview.deleteMany({ where: { OR: [{ userId: { in: delUserIds } }, { saloonId: { in: delSaloonIds } }] } }),
    prisma.booking.deleteMany({ where: { OR: [{ userId: { in: delUserIds } }, { saloonId: { in: delSaloonIds } }] } }),
    prisma.saloonService.deleteMany({ where: { saloonId: { in: delSaloonIds } } }),
    prisma.saloonTimeSlot.deleteMany({ where: { saloonId: { in: delSaloonIds } } }),
    prisma.saloonImage.deleteMany({ where: { saloonId: { in: delSaloonIds } } }),
    // saloon-specific services BEFORE their categories (Service→Category is RESTRICT)
    prisma.service.deleteMany({ where: { id: { in: delServiceIds } } }),
    prisma.category.deleteMany({ where: { saloonId: { in: delSaloonIds } } }),
    prisma.providerApplication.deleteMany({ where: { userId: { in: delUserIds } } }),
    prisma.saloon.deleteMany({ where: { id: { in: delSaloonIds } } }),
    prisma.user.deleteMany({ where: { id: { in: delUserIds } } }),
  ];
  const results = await prisma.$transaction(ops);
  const labels = [
    "saloon_reviews", "bookings", "saloon_services", "saloon_time_slots", "saloon_images",
    "services", "categories", "provider_applications", "saloons", "users",
  ];
  console.log("\nDeleted:");
  results.forEach((r, i) => line(labels[i], r.count));
  console.log("\n✓ Cleanup complete.\n");

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("FAILED:", e);
  await prisma.$disconnect();
  process.exit(1);
});

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const rows = await prisma.$queryRawUnsafe(`
  SELECT
    pa.id,
    pa."userId",
    pa."firstName",
    pa."lastName",
    pa."legalName",
    pa."dateOfBirth",
    pa."finnishId",
    pa."bankAccountName",
    pa.iban,
    pa."businessName",
    pa.address,
    pa.city,
    pa."currentPhase",
    u.email,
    u."stripeId",
    u."stripeAccountStatus",
    u."providerStatus",
    pa."updatedAt"
  FROM provider_applications pa
  LEFT JOIN users u ON u.id = pa."userId"
  WHERE u.email ILIKE '%hdhdf%'
     OR pa."firstName" ILIKE '%hdhdf%'
     OR pa."lastName" ILIKE '%hdhdf%'
     OR pa."businessName" ILIKE '%hdhdf%'
     OR u.name ILIKE '%hdhdf%'
  ORDER BY pa."updatedAt" DESC
`);

console.log(`Matches: ${rows.length}`);
console.log(JSON.stringify(rows, null, 2));

if (rows.length === 0) {
  console.log("\nNo match for 'hdhdf' — showing the 5 most recently updated applications instead:");
  const recent = await prisma.$queryRawUnsafe(`
    SELECT
      pa.id,
      pa."firstName",
      pa."lastName",
      pa."bankAccountName",
      pa.iban,
      pa."dateOfBirth",
      pa."finnishId",
      pa."currentPhase",
      u.email,
      u."stripeId",
      u."providerStatus",
      pa."updatedAt"
    FROM provider_applications pa
    LEFT JOIN users u ON u.id = pa."userId"
    ORDER BY pa."updatedAt" DESC
    LIMIT 5
  `);
  console.log(JSON.stringify(recent, null, 2));
}

await prisma.$disconnect();

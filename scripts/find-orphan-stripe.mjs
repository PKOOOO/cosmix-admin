import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const users = await prisma.$queryRawUnsafe(`
  SELECT id, email, "stripeId", "stripeAccountStatus"
  FROM users
  WHERE "stripeId" IS NOT NULL
  ORDER BY "updatedAt" DESC
`);

console.log("Users with stripeId set:");
console.log(JSON.stringify(users, null, 2));

await prisma.$disconnect();

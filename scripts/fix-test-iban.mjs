import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const before = await prisma.$queryRawUnsafe(
  `SELECT id, "firstName", iban FROM provider_applications WHERE id = $1`,
  "42108993-591d-47d9-a78d-11434f3b5561",
);
console.log("Before:", before);

const result = await prisma.$executeRawUnsafe(
  `UPDATE provider_applications SET iban = $1 WHERE id = $2`,
  "FI2112345600000785",
  "42108993-591d-47d9-a78d-11434f3b5561",
);
console.log(`Rows updated: ${result}`);

const after = await prisma.$queryRawUnsafe(
  `SELECT id, "firstName", iban FROM provider_applications WHERE id = $1`,
  "42108993-591d-47d9-a78d-11434f3b5561",
);
console.log("After:", after);

await prisma.$disconnect();

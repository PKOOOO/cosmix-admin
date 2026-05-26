import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "node:fs";

const prisma = new PrismaClient();

const rows = await prisma.$queryRawUnsafe(
  `SELECT "userId", "transportModes" FROM provider_applications WHERE "transportModes" IS NOT NULL`,
);

const header = "userId,transportModes\n";
const body = rows
  .map((r) => {
    const tm = Array.isArray(r.transportModes)
      ? JSON.stringify(r.transportModes)
      : String(r.transportModes);
    return `${r.userId},"${tm.replace(/"/g, '""')}"`;
  })
  .join("\n");

writeFileSync("transportModes_backup.csv", header + body + "\n");
console.log(`Backed up ${rows.length} rows to transportModes_backup.csv`);
console.log(JSON.stringify(rows, null, 2));

await prisma.$disconnect();

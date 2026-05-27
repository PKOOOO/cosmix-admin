import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const [users, admins, cats, svcs, saloons, bookings, apps, reviews] = await Promise.all([
  prisma.user.count(),
  prisma.user.count({ where: { isAdmin: true } }),
  prisma.category.count(),
  prisma.service.count(),
  prisma.saloon.count(),
  prisma.booking.count(),
  prisma.providerApplication.count(),
  prisma.saloonReview.count(),
]);

console.log("Post-cleanup state:");
console.log(`  users:                ${users} (admins=${admins})`);
console.log(`  categories (keep):    ${cats}`);
console.log(`  services (keep):      ${svcs}`);
console.log(`  saloons:              ${saloons}`);
console.log(`  bookings:             ${bookings}`);
console.log(`  provider applications: ${apps}`);
console.log(`  saloon reviews:       ${reviews}`);

await prisma.$disconnect();

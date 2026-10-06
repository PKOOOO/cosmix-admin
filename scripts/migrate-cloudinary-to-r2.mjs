// Copies every Cloudinary file referenced in the database into Cloudflare R2 and
// rewrites the rows to point at the copies.
//
//   - SaloonImage.url                        -> public bucket,  https://media.kosmiks.com/...
//   - ProviderApplication.qualificationDocs  -> private bucket, r2-private:provider-documents/<userId>/...
//   - ProviderApplication.documentUrls       -> private bucket, same as above
//
// Usage:
//   node --env-file=.env --env-file=.env.local scripts/migrate-cloudinary-to-r2.mjs            (DRY RUN — lists files, no writes)
//   node --env-file=.env --env-file=.env.local scripts/migrate-cloudinary-to-r2.mjs --execute  (copies files, updates rows)
//
// Requires env: DATABASE_URL, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
//               R2_PUBLIC_BUCKET, R2_PRIVATE_BUCKET, R2_PUBLIC_URL
//
// Safe to re-run: rows already pointing at R2 are skipped. Each row is updated only
// after all of its files were copied, so a failure leaves that row on Cloudinary.
// Cloudinary files are never deleted.

import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const EXECUTE = process.argv.includes("--execute");
const env = process.env;

for (const name of ["DATABASE_URL", "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_PUBLIC_BUCKET", "R2_PRIVATE_BUCKET", "R2_PUBLIC_URL"]) {
  if (!env[name]) {
    console.error(`Missing env var ${name}`);
    process.exit(1);
  }
}

const prisma = new PrismaClient();
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
});
const publicUrl = env.R2_PUBLIC_URL.replace(/\/+$/, "");

const EXTENSIONS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/gif": "gif", "application/pdf": "pdf" };

const isCloudinary = (url) => typeof url === "string" && url.includes("res.cloudinary.com");

async function copy(url, bucket, keyPrefix) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed (${res.status})`);
  const contentType = (res.headers.get("content-type") ?? "application/octet-stream").split(";")[0];
  const ext = EXTENSIONS[contentType] ?? url.split("?")[0].split(".").pop() ?? "bin";
  const key = `${keyPrefix}/${randomUUID()}.${ext}`;
  const body = new Uint8Array(await res.arrayBuffer());
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
  return key;
}

async function main() {
  console.log(`\n=== migrate-cloudinary-to-r2 (${EXECUTE ? "EXECUTE" : "DRY RUN"}) ===\n`);
  let failures = 0;

  // --- Salon images (public) -------------------------------------------------
  const images = (await prisma.saloonImage.findMany({ select: { id: true, saloonId: true, url: true } }))
    .filter((image) => isCloudinary(image.url));
  console.log(`Salon images on Cloudinary: ${images.length}`);

  for (const image of images) {
    if (!EXECUTE) {
      console.log(`   would copy  ${image.url}`);
      continue;
    }
    try {
      const key = await copy(image.url, env.R2_PUBLIC_BUCKET, `salon-images/migrated/${image.saloonId}`);
      await prisma.saloonImage.update({ where: { id: image.id }, data: { url: `${publicUrl}/${key}` } });
      console.log(`   ok    ${image.id}`);
    } catch (error) {
      failures++;
      console.error(`   FAIL  ${image.id}  ${image.url}  ${error.message}`);
    }
  }

  // --- Provider documents (private) -------------------------------------------
  const applications = (await prisma.providerApplication.findMany({
    select: { id: true, userId: true, qualificationDocs: true, documentUrls: true },
  })).filter((a) => a.qualificationDocs.some(isCloudinary) || a.documentUrls.some(isCloudinary));
  const docCount = applications.reduce(
    (n, a) => n + a.qualificationDocs.filter(isCloudinary).length + a.documentUrls.filter(isCloudinary).length, 0
  );
  console.log(`\nApplications with Cloudinary documents: ${applications.length} (${docCount} files)`);

  for (const application of applications) {
    if (!EXECUTE) {
      for (const url of [...application.qualificationDocs, ...application.documentUrls].filter(isCloudinary)) {
        console.log(`   would copy  ${url}`);
      }
      continue;
    }
    try {
      const migrate = async (urls) => {
        const out = [];
        for (const url of urls) {
          out.push(isCloudinary(url)
            ? `r2-private:${await copy(url, env.R2_PRIVATE_BUCKET, `provider-documents/${application.userId}`)}`
            : url);
        }
        return out;
      };
      const qualificationDocs = await migrate(application.qualificationDocs);
      const documentUrls = await migrate(application.documentUrls);
      await prisma.providerApplication.update({ where: { id: application.id }, data: { qualificationDocs, documentUrls } });
      console.log(`   ok    application ${application.id}`);
    } catch (error) {
      failures++;
      console.error(`   FAIL  application ${application.id}  ${error.message}`);
    }
  }

  console.log(EXECUTE
    ? `\nDone. ${failures} failure(s). Re-run to retry failed rows.\n`
    : `\nDry run only. Re-run with --execute to copy files and update rows.\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

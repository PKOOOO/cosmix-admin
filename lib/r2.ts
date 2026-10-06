import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 storage.
 *
 * Two buckets:
 * - public  (R2_PUBLIC_BUCKET)  — salon photos, served from R2_PUBLIC_URL (media.kosmiks.com)
 * - private (R2_PRIVATE_BUCKET) — provider qualification documents, never publicly reachable.
 *
 * Private files are stored in the database as `r2-private:<key>` references, not URLs.
 * Use `resolveDocumentUrl()` to turn one into a short-lived signed link for admins.
 */

export type UploadKind = "image" | "document";

export const PRIVATE_REF_PREFIX = "r2-private:";
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

const CONTENT_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

let client: S3Client | null = null;

function config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const publicBucket = process.env.R2_PUBLIC_BUCKET;
  const privateBucket = process.env.R2_PRIVATE_BUCKET;
  const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/+$/, "");

  if (!accountId || !accessKeyId || !secretAccessKey || !publicBucket || !privateBucket || !publicUrl) {
    throw new Error("R2 is not configured");
  }
  return { accountId, accessKeyId, secretAccessKey, publicBucket, privateBucket, publicUrl };
}

function getClient() {
  if (!client) {
    const { accountId, accessKeyId, secretAccessKey } = config();
    client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return client;
}

export function extensionFor(contentType: string): string | null {
  return CONTENT_TYPES[contentType.toLowerCase()] ?? null;
}

/** Object key, namespaced by owner so documents can be checked against the uploader. */
export function buildKey(kind: UploadKind, userId: string, contentType: string): string {
  const ext = extensionFor(contentType) ?? "bin";
  const folder = kind === "document" ? "provider-documents" : "salon-images";
  return `${folder}/${userId}/${randomUUID()}.${ext}`;
}

function bucketFor(kind: UploadKind) {
  const { publicBucket, privateBucket } = config();
  return kind === "document" ? privateBucket : publicBucket;
}

/** Value to store in the database for an uploaded object. */
export function storedValueFor(kind: UploadKind, key: string): string {
  return kind === "document" ? `${PRIVATE_REF_PREFIX}${key}` : `${config().publicUrl}/${key}`;
}

export async function putObject(kind: UploadKind, key: string, body: Uint8Array, contentType: string) {
  await getClient().send(
    new PutObjectCommand({ Bucket: bucketFor(kind), Key: key, Body: body, ContentType: contentType })
  );
}

/**
 * Presigned PUT the app uploads to directly, bypassing Vercel's ~4.5 MB body limit.
 * Content-Type and Content-Length are signed, so the client can't swap the file type or size.
 */
export async function presignUpload(kind: UploadKind, key: string, contentType: string, size: number) {
  return getSignedUrl(
    getClient(),
    new PutObjectCommand({ Bucket: bucketFor(kind), Key: key, ContentType: contentType, ContentLength: size }),
    { expiresIn: 300, signableHeaders: new Set(["content-type", "content-length"]) }
  );
}

/** True when a stored document value is a private R2 reference owned by `userId`. */
export function isOwnDocumentRef(value: string, userId: string): boolean {
  return value.startsWith(`${PRIVATE_REF_PREFIX}provider-documents/${userId}/`);
}

/**
 * Turns a stored document value into something an admin can open.
 * Private refs become signed links valid for 30 minutes; legacy URLs pass through.
 */
export async function resolveDocumentUrl(value: string): Promise<string> {
  if (!value.startsWith(PRIVATE_REF_PREFIX)) return value;
  const key = value.slice(PRIVATE_REF_PREFIX.length);
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: config().privateBucket, Key: key }),
    { expiresIn: 1800 }
  );
}

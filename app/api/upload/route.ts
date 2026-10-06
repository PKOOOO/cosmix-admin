import { NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin-access";
import {
  MAX_UPLOAD_BYTES,
  buildKey,
  extensionFor,
  putObject,
  storedValueFor,
  type UploadKind,
} from "@/lib/r2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Token",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * Multipart upload proxied through the API. Kept for app builds released before the
 * direct-to-R2 flow (/api/upload/presign); new builds use presign instead.
 * Limited by Vercel's ~4.5 MB request body cap.
 */
export async function POST(req: Request) {
  try {
    const { user } = await checkAdminAccess();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const kind: UploadKind = formData.get("kind") === "document" ? "document" : "image";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400, headers: corsHeaders });
    }

    const contentType = (file.type || "image/jpeg").toLowerCase();
    if (!extensionFor(contentType)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400, headers: corsHeaders });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "File is too large (max 10 MB)" }, { status: 413, headers: corsHeaders });
    }

    const key = buildKey(kind, user.id, contentType);
    await putObject(kind, key, new Uint8Array(await file.arrayBuffer()), contentType);

    return NextResponse.json({ url: storedValueFor(kind, key) }, { headers: corsHeaders });
  } catch (error) {
    console.error("[UPLOAD]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

export const runtime = "nodejs";

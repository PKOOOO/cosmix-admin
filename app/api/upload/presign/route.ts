import { NextResponse } from "next/server";
import { getEndUser } from "@/lib/admin-access";
import {
  MAX_UPLOAD_BYTES,
  buildKey,
  extensionFor,
  presignUpload,
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
 * Step 1 of a direct-to-R2 upload. The app sends { kind, contentType, size },
 * gets back a presigned PUT URL, uploads the file straight to R2, then saves `url`.
 *
 * `url` is a public media URL for images, or an `r2-private:` reference for documents.
 */
export async function POST(req: Request) {
  try {
    const user = await getEndUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const body = await req.json().catch(() => null);
    const kind: UploadKind = body?.kind === "document" ? "document" : "image";
    const contentType = typeof body?.contentType === "string" ? body.contentType.toLowerCase() : "";
    const size = Number(body?.size);

    if (!extensionFor(contentType)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400, headers: corsHeaders });
    }
    if (!Number.isInteger(size) || size <= 0) {
      return NextResponse.json({ error: "Invalid file size" }, { status: 400, headers: corsHeaders });
    }
    if (size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "File is too large (max 10 MB)" }, { status: 413, headers: corsHeaders });
    }

    const key = buildKey(kind, user.id, contentType);
    const uploadUrl = await presignUpload(kind, key, contentType, size);

    return NextResponse.json(
      {
        uploadUrl,
        headers: { "Content-Type": contentType },
        url: storedValueFor(kind, key),
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[UPLOAD_PRESIGN]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

export const runtime = "nodejs";

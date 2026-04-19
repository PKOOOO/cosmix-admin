import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin-access";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Token",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const { user } = await checkAdminAccess();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.error("[UPLOAD] Missing Cloudinary env vars");
      return NextResponse.json({ error: "Upload not configured" }, { status: 500, headers: corsHeaders });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400, headers: corsHeaders });
    }

    // Build signed upload params
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const folder = "cosmix/provider-documents";
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature = createHash("sha1")
      .update(paramsToSign + apiSecret)
      .digest("hex");

    // Forward file to Cloudinary upload API
    const uploadForm = new FormData();
    uploadForm.append("file", file);
    uploadForm.append("api_key", apiKey);
    uploadForm.append("timestamp", timestamp);
    uploadForm.append("signature", signature);
    uploadForm.append("folder", folder);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      { method: "POST", body: uploadForm }
    );

    if (!res.ok) {
      const body = await res.text();
      console.error("[UPLOAD] Cloudinary error:", res.status, body);
      return NextResponse.json({ error: "Upload failed" }, { status: 502, headers: corsHeaders });
    }

    const data = await res.json();
    return NextResponse.json(
      { url: data.secure_url, publicId: data.public_id },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[UPLOAD]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

export const runtime = "nodejs";

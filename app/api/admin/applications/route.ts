import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { checkAdminAccess } from "@/lib/admin-access";
import { resolveDocumentUrl } from "@/lib/r2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Token",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
  try {
    const { isAdmin, user } = await checkAdminAccess();
    if (!user || !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
    }

    const applications = await prismadb.providerApplication.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true, providerStatus: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Documents live in a private bucket — hand admins short-lived signed links.
    const withDocumentLinks = await Promise.all(
      applications.map(async application => ({
        ...application,
        qualificationDocs: await Promise.all(application.qualificationDocs.map(resolveDocumentUrl)),
      }))
    );

    return NextResponse.json({ applications: withDocumentLinks }, { headers: corsHeaders });
  } catch (error) {
    console.error("[ADMIN_APPLICATIONS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

export const runtime = "nodejs";

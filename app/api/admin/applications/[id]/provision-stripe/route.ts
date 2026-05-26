import { NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin-access";
import { provisionStripeForApplication } from "@/lib/provision-stripe";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Token",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// POST /api/admin/applications/[id]/provision-stripe
// Idempotent — creates a pre-filled Stripe Express account for an approved application
// whose user has no stripeId yet (e.g. approved before Stripe code was deployed).
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { isAdmin, user } = await checkAdminAccess();
    if (!user || !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
    }

    const result = await provisionStripeForApplication(params.id);

    switch (result.status) {
      case "skipped_has_stripe_id":
        return NextResponse.json(result, { status: 200, headers: corsHeaders });
      case "skipped_missing_fields":
        return NextResponse.json(result, { status: 400, headers: corsHeaders });
      case "created":
        return NextResponse.json(result, { status: 200, headers: corsHeaders });
      case "failed":
        return NextResponse.json(result, { status: 502, headers: corsHeaders });
    }
  } catch (error) {
    console.error("[ADMIN_PROVISION_STRIPE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

export const runtime = "nodejs";

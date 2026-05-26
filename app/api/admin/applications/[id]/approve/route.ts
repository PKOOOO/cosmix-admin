import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
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

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { isAdmin, user } = await checkAdminAccess();
    if (!user || !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
    }

    const application = await prismadb.providerApplication.findUnique({
      where: { id: params.id },
      include: { user: true },
    });

    if (!application) {
      return NextResponse.json({ error: "Not found" }, { status: 404, headers: corsHeaders });
    }

    const nextStatus = ({ 1: "PHASE1_APPROVED", 2: "PHASE2_APPROVED", 3: "ACTIVE" } as Record<number, string>)[application.currentPhase];

    if (!nextStatus) {
      return NextResponse.json({ error: "Invalid phase" }, { status: 400, headers: corsHeaders });
    }

    const body = await req.json().catch(() => ({}));

    await prismadb.user.update({
      where: { id: application.userId },
      data: { providerStatus: nextStatus as any },
    });

    await prismadb.providerApplication.update({
      where: { id: params.id },
      data: { adminNotes: body.notes ?? null },
    });

    // Phase 2 approved → create Saloon so provider can add services in phase 3
    if (application.currentPhase === 2) {
      const existingSaloon = await prismadb.saloon.findFirst({
        where: { userId: application.userId },
      });

      if (!existingSaloon) {
        await prismadb.saloon.create({
          data: {
            name: application.businessName ?? `${application.firstName ?? ""} ${application.lastName ?? ""}`.trim(),
            userId: application.userId,
            address: application.address,
          },
        });
      }

      // Auto-create pre-filled Stripe Express account (idempotent — skips if stripeId already set
      // or if required fields are missing). Errors are logged but don't block approval; admin can
      // retry via POST /api/admin/applications/[id]/provision-stripe.
      const stripeResult = await provisionStripeForApplication(application.id);
      console.log("[Stripe] provision result:", stripeResult.status);
    }

    return NextResponse.json({ success: true, nextStatus }, { headers: corsHeaders });
  } catch (error) {
    console.error("[ADMIN_APPLICATION_APPROVE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

export const runtime = "nodejs";

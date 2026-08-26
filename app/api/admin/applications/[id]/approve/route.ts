import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { checkAdminAccess } from "@/lib/admin-access";
import { sendPushNotification } from "@/lib/send-notification";

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

    // Only phases 1 and 2 are admin-reviewed. Phase 3 (salon setup) activates the
    // provider on submission, so an application at phase 3 is already ACTIVE and
    // has nothing left to approve.
    const nextStatus = ({ 1: "PHASE1_APPROVED", 2: "PHASE2_APPROVED" } as Record<number, string>)[application.currentPhase];

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

    }

    // Best-effort notification — the approval is already committed, so a failure
    // here must not affect the response. Branch on currentPhase, the same source
    // of truth the nextStatus map uses; an invalid phase already returned 400.
    try {
      const providerToken = application.user?.pushToken;
      if (providerToken) {
        if (application.currentPhase === 1) {
          // P2
          await sendPushNotification(
            providerToken,
            "Phase 1 Approved ✓",
            "Continue to Phase 2 to verify your details.",
            { type: "provider_phase1_approved" }
          );
        } else if (application.currentPhase === 2) {
          // P4
          await sendPushNotification(
            providerToken,
            "Phase 2 Approved ✓",
            "You're verified. Set up your salon to go live.",
            { type: "provider_phase2_approved" }
          );
        }
      }
    } catch (pushError) {
      console.error("[ADMIN_APPLICATION_APPROVE] push failed:", pushError);
    }

    return NextResponse.json({ success: true, nextStatus }, { headers: corsHeaders });
  } catch (error) {
    console.error("[ADMIN_APPLICATION_APPROVE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

export const runtime = "nodejs";

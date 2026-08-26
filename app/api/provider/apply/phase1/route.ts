import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { getEndUser } from "@/lib/admin-access";
import { sendPushNotification, notifyAdmins } from "@/lib/send-notification";

// Statuses from which submitting Phase 1 is legitimate: a first application, a
// re-application after rejection, or an edit while still awaiting review.
// Anything further along would be a demotion.
const PHASE1_SUBMITTABLE = ["NOT_APPLIED", "REJECTED", "PHASE1_PENDING"];

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
    const user = await getEndUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const dbUser = await prismadb.user.findUnique({
      where: { id: user.id },
      select: { providerStatus: true, pushToken: true },
    });

    if (!dbUser || !PHASE1_SUBMITTABLE.includes(dbUser.providerStatus)) {
      return NextResponse.json(
        { error: "Application already in progress" },
        { status: 403, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const { firstName, lastName, phone, city, address, serviceCategories, neighbourhood } = body;

    if (!firstName || !lastName || !phone || !city || !address || !serviceCategories?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: corsHeaders });
    }

    const application = await prismadb.providerApplication.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        firstName,
        lastName,
        phone,
        city,
        neighbourhood: neighbourhood ?? null,
        address,
        serviceCategories,
        currentPhase: 1,
      },
      update: {
        firstName,
        lastName,
        phone,
        city,
        neighbourhood: neighbourhood ?? null,
        address,
        serviceCategories,
        // Re-applying restarts the funnel at Phase 1. Without this, a provider
        // rejected at Phase 2 kept currentPhase = 2, so approving their Phase 1
        // re-application jumped them to PHASE2_APPROVED — skipping IBAN, date of
        // birth and qualification documents entirely.
        currentPhase: 1,
        // Stale reason would otherwise still be shown to the applicant.
        rejectedReason: null,
      },
    });

    await prismadb.user.update({
      where: { id: user.id },
      data: { providerStatus: "PHASE1_PENDING" },
    });

    // Best-effort notifications. The application is already saved at this point,
    // so nothing here may affect the response. Both senders swallow their own
    // errors; the wrapper is defensive per the notification contract.
    try {
      await Promise.all([
        // P1 → applicant
        dbUser.pushToken
          ? sendPushNotification(
              dbUser.pushToken,
              "Application Received",
              "We've got your details. We'll review them shortly.",
              { type: "provider_phase1_submitted" }
            )
          : Promise.resolve(),
        // A1 → admins
        notifyAdmins(
          "New Application",
          `${firstName} ${lastName} applied — Phase 1`,
          { type: "admin_new_application" }
        ),
      ]);
    } catch (pushError) {
      console.error("[PROVIDER_APPLY_PHASE1] push failed:", pushError);
    }

    return NextResponse.json({ success: true, application }, { headers: corsHeaders });
  } catch (error) {
    console.error("[PROVIDER_APPLY_PHASE1]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

export const runtime = "nodejs";

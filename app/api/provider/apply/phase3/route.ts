import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { getEndUser } from "@/lib/admin-access";
import { sendPushNotification, notifyAdmins } from "@/lib/send-notification";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Token",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST() {
  try {
    const user = await getEndUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const dbUser = await prismadb.user.findUnique({
      where: { id: user.id },
      select: { providerStatus: true, pushToken: true },
    });

    if (dbUser?.providerStatus !== "PHASE2_APPROVED") {
      return NextResponse.json(
        { error: "Phase 2 must be approved before completing salon setup" },
        { status: 403, headers: corsHeaders }
      );
    }

    const application = await prismadb.providerApplication.update({
      where: { userId: user.id },
      data: { currentPhase: 3 },
    });

    await prismadb.user.update({
      where: { id: user.id },
      data: { providerStatus: "ACTIVE" },
    });

    // Best-effort notifications — the provider is already ACTIVE, so a failure
    // here must not affect the response.
    try {
      // Phase 3 carries no request body, so the name comes off the application.
      const providerName =
        application.legalName?.trim() ||
        [application.firstName, application.lastName].filter(Boolean).join(" ").trim() ||
        user.email;

      await Promise.all([
        // P5 → provider
        dbUser.pushToken
          ? sendPushNotification(
              dbUser.pushToken,
              "Your Salon Is Live! 🎉",
              "You can now start accepting bookings.",
              { type: "provider_active" }
            )
          : Promise.resolve(),
        // A3 → admins
        notifyAdmins(
          "Salon Setup Complete",
          `${providerName} is now live`,
          { type: "admin_salon_live" }
        ),
      ]);
    } catch (pushError) {
      console.error("[PROVIDER_APPLY_PHASE3] push failed:", pushError);
    }

    return NextResponse.json({ success: true, status: "ACTIVE" }, { headers: corsHeaders });
  } catch (error) {
    console.error("[PROVIDER_APPLY_PHASE3]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

export const runtime = "nodejs";

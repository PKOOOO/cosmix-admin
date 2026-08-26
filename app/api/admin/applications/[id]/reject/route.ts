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

    const { reason } = await req.json();
    if (!reason?.trim()) {
      return NextResponse.json({ error: "Rejection reason required" }, { status: 400, headers: corsHeaders });
    }

    const application = await prismadb.providerApplication.findUnique({
      where: { id: params.id },
      include: { user: { select: { pushToken: true } } },
    });

    if (!application) {
      return NextResponse.json({ error: "Not found" }, { status: 404, headers: corsHeaders });
    }

    await prismadb.user.update({
      where: { id: application.userId },
      data: { providerStatus: "REJECTED" as any },
    });

    await prismadb.providerApplication.update({
      where: { id: params.id },
      data: { rejectedReason: reason.trim() },
    });

    // Best-effort notification — the rejection is already committed, so a failure
    // here must not affect the response.
    try {
      const providerToken = application.user?.pushToken;
      if (providerToken) {
        const trimmed = reason.trim();
        // The handler 400s on an empty reason, so the bare sentence is a
        // fallback in case that validation is ever relaxed — never "undefined".
        const body = trimmed
          ? `Your application wasn't approved. Reason: ${trimmed}`
          : "Your application wasn't approved.";

        // P6
        await sendPushNotification(providerToken, "Application Update", body, {
          type: "provider_rejected",
        });
      }
    } catch (pushError) {
      console.error("[ADMIN_APPLICATION_REJECT] push failed:", pushError);
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error("[ADMIN_APPLICATION_REJECT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

export const runtime = "nodejs";

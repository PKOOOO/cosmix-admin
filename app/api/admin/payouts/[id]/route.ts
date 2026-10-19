import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { sendPushNotification } from "@/lib/send-notification";
import { requireHumanAdmin, PAYOUT_STATUSES, PAYOUT_TRANSITIONS, type PayoutStatus } from "@/lib/payouts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Token",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

const eur = (n: number) =>
  new Intl.NumberFormat("fi-FI", { style: "currency", currency: "EUR" }).format(n);

// PATCH /api/admin/payouts/:id  { status: "sent" | "arrived" | "failed", reference?, failureReason? }
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireHumanAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const next = body.status as PayoutStatus;
    if (!(PAYOUT_STATUSES as readonly string[]).includes(next)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400, headers: corsHeaders });
    }

    const payout = await prismadb.payout.findUnique({
      where: { id: params.id },
      include: { user: { select: { pushToken: true } } },
    });
    if (!payout) return NextResponse.json({ error: "Not found" }, { status: 404, headers: corsHeaders });

    const current = payout.status as PayoutStatus;
    if (!PAYOUT_TRANSITIONS[current]?.includes(next)) {
      return NextResponse.json(
        { error: `Can't change a ${current} payout to ${next}` },
        { status: 409, headers: corsHeaders },
      );
    }

    const now = new Date();
    const reference = typeof body.reference === "string" && body.reference.trim() ? body.reference.trim() : undefined;

    const updated = await prismadb.$transaction(async (tx) => {
      // Conditional on the status we checked, so two admins can't both apply a change.
      const changed = await tx.payout.updateMany({
        where: { id: payout.id, status: current },
        data: {
          status: next,
          ...(next === "sent" && { sentAt: now }),
          ...(next === "arrived" && { arrivedAt: now, sentAt: payout.sentAt ?? now }),
          ...(next === "failed" && {
            failedAt: now,
            failureReason: typeof body.failureReason === "string" ? body.failureReason.trim() || null : null,
          }),
          ...(reference && { reference }),
        },
      });
      if (changed.count === 0) return null;

      // A failed transfer releases its bookings so they're paid in the next run.
      if (next === "failed") {
        await tx.booking.updateMany({ where: { payoutId: payout.id }, data: { payoutId: null } });
      }
      return tx.payout.findUnique({ where: { id: payout.id } });
    });

    if (!updated) {
      return NextResponse.json({ error: "Payout was changed by someone else — reload" }, { status: 409, headers: corsHeaders });
    }

    // P9 — best effort, never affects the response.
    if (next === "sent" && payout.user?.pushToken) {
      try {
        await sendPushNotification(
          payout.user.pushToken,
          "Payout sent 💸",
          `${eur(payout.amount)} is on its way to your bank account.`,
          { type: "provider_payout_sent", payoutId: payout.id },
        );
      } catch (pushError) {
        console.error("[ADMIN_PAYOUT_PATCH] push failed:", pushError);
      }
    }

    return NextResponse.json(updated, { headers: corsHeaders });
  } catch (error) {
    console.error("[ADMIN_PAYOUT_PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

export const runtime = "nodejs";

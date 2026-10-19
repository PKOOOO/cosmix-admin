import { NextResponse } from "next/server";
import { runPayouts } from "@/lib/payouts";

// Weekly payout run, triggered by Vercel Cron (see vercel.json). Vercel sends
// `Authorization: Bearer $CRON_SECRET`; without CRON_SECRET set this route
// refuses every call rather than running unauthenticated.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runPayouts();
    console.log(`[CRON_PAYOUTS] created ${result.created.length}, skipped ${result.skipped.length}`);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[CRON_PAYOUTS]", error);
    return NextResponse.json({ error: "Payout run failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

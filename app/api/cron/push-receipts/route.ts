import { NextResponse } from "next/server";
import { checkPushReceipts } from "@/lib/send-notification";

// Daily push receipt check, triggered by Vercel Cron (see vercel.json). Removes
// tokens Expo reports as DeviceNotRegistered so dead devices stop piling up.
// Vercel sends `Authorization: Bearer $CRON_SECRET`; without CRON_SECRET set
// this route refuses every call rather than running unauthenticated.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await checkPushReceipts();
    console.log(`[CRON_PUSH_RECEIPTS] checked ${result.checked}, removed ${result.removed}`);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[CRON_PUSH_RECEIPTS]", error);
    return NextResponse.json({ error: "Receipt check failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

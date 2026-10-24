// app/api/public/health/route.ts
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

// Public health check (no authentication required). The mobile app calls this
// when a request fails while the device is online, to tell "your internet is
// down" apart from "our server or database is down".
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        await prismadb.$queryRaw`SELECT 1`;
        return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        console.error("[HEALTH] database check failed:", error);
        return NextResponse.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
}

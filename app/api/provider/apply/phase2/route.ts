import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { checkAdminAccess } from "@/lib/admin-access";

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
    const { user } = await checkAdminAccess();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    // Enforce phase order — must be PHASE1_APPROVED before submitting phase 2
    const dbUser = await prismadb.user.findUnique({
      where: { id: user.id },
      select: { providerStatus: true },
    });

    if (dbUser?.providerStatus !== "PHASE1_APPROVED") {
      return NextResponse.json(
        { error: "Phase 1 must be approved before submitting Phase 2" },
        { status: 403, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const { legalName, dateOfBirth, iban, bankAccountName, idPhotoUrl, termsAccepted } = body;

    if (!legalName || !dateOfBirth || !iban || !bankAccountName || !idPhotoUrl || !termsAccepted) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: corsHeaders });
    }

    // Enforce 18+ server-side
    const dobMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateOfBirth);
    if (!dobMatch) {
      return NextResponse.json({ error: "Invalid date of birth format" }, { status: 400, headers: corsHeaders });
    }
    const dob = new Date(Number(dobMatch[3]), Number(dobMatch[2]) - 1, Number(dobMatch[1]));
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 18);
    if (dob.getTime() > cutoff.getTime()) {
      return NextResponse.json({ error: "Must be 18 or older to register" }, { status: 400, headers: corsHeaders });
    }

    const cleanIban = String(iban).replace(/\s+/g, "").toUpperCase();
    if (!/^FI\d{16}$/.test(cleanIban)) {
      return NextResponse.json({ error: "Invalid Finnish IBAN" }, { status: 400, headers: corsHeaders });
    }

    await prismadb.providerApplication.update({
      where: { userId: user.id },
      data: {
        legalName,
        dateOfBirth,
        bankAccountName,
        iban: cleanIban,
        idPhotoUrl,
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        currentPhase: 2,
      },
    });

    await prismadb.user.update({
      where: { id: user.id },
      data: { providerStatus: "PHASE2_PENDING" },
    });

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error("[PROVIDER_APPLY_PHASE2]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

export const runtime = "nodejs";

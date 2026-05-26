import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { checkAdminAccess } from "@/lib/admin-access";
import { stripe } from "@/lib/stripe";

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

      // Auto-create pre-filled Stripe Express account (only if user doesn't already have one)
      if (!application.user.stripeId) {
        try {
          if (
            !application.dateOfBirth ||
            !application.firstName ||
            !application.lastName ||
            !application.finnishId ||
            !application.address ||
            !application.city ||
            !application.bankAccountName ||
            !application.iban
          ) {
            throw new Error("Application missing required fields for Stripe pre-fill");
          }

          const [day, month, year] = application.dateOfBirth.split("/").map(Number);

          const account = await stripe.accounts.create({
            type: "express",
            country: "FI",
            email: application.user.email,
            capabilities: {
              card_payments: { requested: true },
              transfers: { requested: true },
            },
            business_type: "individual",
            individual: {
              first_name: application.firstName,
              last_name: application.lastName,
              email: application.user.email,
              dob: { day, month, year },
              id_number: application.finnishId,
              address: {
                line1: application.address,
                city: application.city,
                country: "FI",
              },
            },
            business_profile: {
              name: application.businessName || `${application.firstName} ${application.lastName}`,
              mcc: "7230",
              url: process.env.NEXT_PUBLIC_APP_URL || "https://cosmix-admin-one.vercel.app",
            },
            external_account: {
              object: "bank_account",
              country: "FI",
              currency: "eur",
              account_holder_name: application.bankAccountName,
              account_number: application.iban,
            },
          });

          await prismadb.user.update({
            where: { id: application.userId },
            data: {
              stripeId: account.id,
              stripeAccountStatus: "incomplete",
            },
          });
        } catch (stripeError) {
          console.error("[ADMIN_APPLICATION_APPROVE_STRIPE]", stripeError);
          // Don't fail the approval; provider can complete Stripe setup manually later
        }
      }
    }

    return NextResponse.json({ success: true, nextStatus }, { headers: corsHeaders });
  } catch (error) {
    console.error("[ADMIN_APPLICATION_APPROVE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

export const runtime = "nodejs";

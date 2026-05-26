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
      console.log("[Stripe] User stripeId before:", application.user.stripeId);

      if (!application.user.stripeId) {
        console.log("[Stripe] Creating account for:", {
          applicationId: application.id,
          userId: application.userId,
          email: application.user.email,
          firstName: application.firstName,
          lastName: application.lastName,
          dob: application.dateOfBirth,
          finnishId: application.finnishId,
          address: application.address,
          city: application.city,
          businessName: application.businessName,
          iban: application.iban,
          bankAccountName: application.bankAccountName,
        });

        const missing: string[] = [];
        if (!application.dateOfBirth) missing.push("dateOfBirth");
        if (!application.firstName) missing.push("firstName");
        if (!application.lastName) missing.push("lastName");
        if (!application.finnishId) missing.push("finnishId");
        if (!application.address) missing.push("address");
        if (!application.city) missing.push("city");
        if (!application.bankAccountName) missing.push("bankAccountName");
        if (!application.iban) missing.push("iban");

        if (missing.length > 0) {
          console.error("[Stripe] SKIPPED — missing required fields:", missing);
        } else {
          try {
            const [day, month, year] = application.dateOfBirth!.split("/").map(Number);
            console.log("[Stripe] Parsed DOB:", { day, month, year });

            const accountPayload = {
              type: "express" as const,
              country: "FI",
              email: application.user.email,
              capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
              },
              business_type: "individual" as const,
              individual: {
                first_name: application.firstName!,
                last_name: application.lastName!,
                email: application.user.email,
                dob: { day, month, year },
                id_number: application.finnishId!,
                address: {
                  line1: application.address!,
                  city: application.city!,
                  country: "FI",
                },
              },
              business_profile: {
                name: application.businessName || `${application.firstName} ${application.lastName}`,
                mcc: "7230",
                url: process.env.NEXT_PUBLIC_APP_URL || "https://cosmix-admin-one.vercel.app",
              },
              external_account: {
                object: "bank_account" as const,
                country: "FI",
                currency: "eur",
                account_holder_name: application.bankAccountName!,
                account_number: application.iban!,
              },
            };

            console.log("[Stripe] Calling stripe.accounts.create with payload:", JSON.stringify(accountPayload, null, 2));

            const account = await stripe.accounts.create(accountPayload);

            console.log("[Stripe] Account created:", account.id);
            console.log("[Stripe] charges_enabled:", account.charges_enabled, "payouts_enabled:", account.payouts_enabled);
            console.log("[Stripe] Requirements:", JSON.stringify(account.requirements, null, 2));
            console.log("[Stripe] external_accounts count:", account.external_accounts?.data?.length ?? 0);

            await prismadb.user.update({
              where: { id: application.userId },
              data: {
                stripeId: account.id,
                stripeAccountStatus: "incomplete",
              },
            });

            console.log("[Stripe] Saved stripeId to user:", application.userId);
          } catch (stripeError: any) {
            // Surface the real Stripe error so we can see it in Vercel logs
            console.error("[Stripe] CREATE FAILED");
            console.error("[Stripe] type:", stripeError?.type);
            console.error("[Stripe] code:", stripeError?.code);
            console.error("[Stripe] param:", stripeError?.param);
            console.error("[Stripe] statusCode:", stripeError?.statusCode);
            console.error("[Stripe] message:", stripeError?.message);
            console.error("[Stripe] raw:", stripeError?.raw);
            console.error("[Stripe] stack:", stripeError?.stack);
            // Don't fail the approval; provider can complete Stripe setup manually later
          }
        }
      } else {
        console.log("[Stripe] Skipped — user already has stripeId:", application.user.stripeId);
      }
    }

    return NextResponse.json({ success: true, nextStatus }, { headers: corsHeaders });
  } catch (error) {
    console.error("[ADMIN_APPLICATION_APPROVE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

export const runtime = "nodejs";

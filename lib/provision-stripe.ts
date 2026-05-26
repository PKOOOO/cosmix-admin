import prismadb from "@/lib/prismadb";
import { stripe } from "@/lib/stripe";

export type ProvisionStripeResult =
  | { status: "skipped_has_stripe_id"; stripeId: string }
  | { status: "skipped_missing_fields"; missing: string[] }
  | { status: "created"; stripeId: string }
  | { status: "failed"; error: { type?: string; code?: string; param?: string; statusCode?: number; message?: string; raw?: unknown } };

/**
 * Idempotent Stripe Express account creation for an approved provider application.
 * - If user already has stripeId → skipped_has_stripe_id
 * - If application is missing required pre-fill fields → skipped_missing_fields
 * - On success → created (user.stripeId + user.stripeAccountStatus = 'incomplete' persisted)
 * - On Stripe error → failed (no DB change)
 *
 * Callers MUST have already done their own admin/authorization checks.
 */
export async function provisionStripeForApplication(applicationId: string): Promise<ProvisionStripeResult> {
  const application = await prismadb.providerApplication.findUnique({
    where: { id: applicationId },
    include: { user: true },
  });

  if (!application) {
    throw new Error(`Application not found: ${applicationId}`);
  }

  console.log("[Stripe] provisionStripe called for app:", applicationId, "user:", application.userId, "stripeId before:", application.user.stripeId);

  if (application.user.stripeId) {
    console.log("[Stripe] Skipped — user already has stripeId:", application.user.stripeId);
    return { status: "skipped_has_stripe_id", stripeId: application.user.stripeId };
  }

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
    return { status: "skipped_missing_fields", missing };
  }

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
    return { status: "created", stripeId: account.id };
  } catch (stripeError: any) {
    console.error("[Stripe] CREATE FAILED");
    console.error("[Stripe] type:", stripeError?.type);
    console.error("[Stripe] code:", stripeError?.code);
    console.error("[Stripe] param:", stripeError?.param);
    console.error("[Stripe] statusCode:", stripeError?.statusCode);
    console.error("[Stripe] message:", stripeError?.message);
    console.error("[Stripe] raw:", stripeError?.raw);
    console.error("[Stripe] stack:", stripeError?.stack);
    return {
      status: "failed",
      error: {
        type: stripeError?.type,
        code: stripeError?.code,
        param: stripeError?.param,
        statusCode: stripeError?.statusCode,
        message: stripeError?.message,
        raw: stripeError?.raw,
      },
    };
  }
}

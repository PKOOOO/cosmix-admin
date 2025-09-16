import { NextResponse } from "next/server";

export async function GET() {
    // Handle refresh callback from Stripe
    // Redirect back to the integration page
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=integrations`);
}

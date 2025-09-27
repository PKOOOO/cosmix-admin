import { NextResponse } from "next/server";

export async function GET() {
    // Handle success callback from Stripe
    // Redirect back to the integration page with success message
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/integration?stripe=connected`);
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { paytrail } from "@/lib/paytrail";

export async function GET(req: NextRequest) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Find the user in the database
    const user = await prismadb.user.findUnique({
      where: { clerkId: userId }
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // For Paytrail, we don't need account linking like Stripe Connect
    // Instead, we provide merchant onboarding information
    const merchantInfo = {
      merchantId: process.env.PAYTRAIL_MERCHANT_ID,
      isConfigured: !!process.env.PAYTRAIL_MERCHANT_ID && !!process.env.PAYTRAIL_SECRET_KEY,
      onboardingUrl: "https://www.paytrail.com/en/merchant-onboarding",
      documentationUrl: "https://docs.paytrail.com/",
      supportUrl: "https://support.paytrail.com/",
    };

    return NextResponse.json(merchantInfo);
  } catch (error) {
    console.error("Error getting Paytrail merchant info:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Find the user in the database
    const user = await prismadb.user.findUnique({
      where: { clerkId: userId }
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // For Paytrail, merchant configuration is done through environment variables
    // This endpoint can be used to verify configuration status
    const isConfigured = !!process.env.PAYTRAIL_MERCHANT_ID && !!process.env.PAYTRAIL_SECRET_KEY;
    
    if (!isConfigured) {
      return NextResponse.json({ 
        error: "Paytrail not configured. Please set PAYTRAIL_MERCHANT_ID and PAYTRAIL_SECRET_KEY environment variables.",
        configured: false 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      message: "Paytrail merchant configuration verified",
      configured: true 
    });
  } catch (error) {
    console.error("Error verifying Paytrail merchant configuration:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

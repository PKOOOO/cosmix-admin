import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { paytrail } from "@/lib/paytrail";

export async function POST(req: Request) {
    try {
        const body = await req.text();
        const signature = req.headers.get("paytrail-signature");
        
        if (!signature) {
            console.error("Paytrail webhook signature missing");
            return new NextResponse("Signature missing", { status: 400 });
        }

        // Verify webhook signature
        const isValid = (paytrail as any).verifyWebhookSignature(body, signature);
        
        if (!isValid) {
            console.error("Paytrail webhook signature verification failed");
            return new NextResponse("Invalid signature", { status: 400 });
        }

        const webhookData = JSON.parse(body);
        console.log("Paytrail cancel webhook received:", webhookData);

        // Extract booking IDs from metadata
        const bookingIds = webhookData.metadata?.bookingIds?.split(',') || [];
        
        if (bookingIds.length === 0) {
            console.error("No booking IDs found in webhook metadata");
            return new NextResponse("No booking IDs", { status: 400 });
        }

        // Update booking status to cancelled
        for (const bookingId of bookingIds) {
            await prismadb.booking.update({
                where: { id: bookingId },
                data: { 
                    status: 'cancelled',
                }
            });
        }
        
        console.log(`Updated ${bookingIds.length} bookings to cancelled status`);
        
        return NextResponse.json({ received: true });
    } catch (error) {
        console.error("Paytrail cancel webhook error:", error);
        return new NextResponse("Webhook error", { status: 500 });
    }
}

export const runtime = "nodejs";

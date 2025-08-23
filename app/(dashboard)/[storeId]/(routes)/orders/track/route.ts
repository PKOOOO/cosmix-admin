// app/api/[storeId]/orders/track/route.ts
import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function GET(
  req: NextRequest,
  { params }: { params: { storeId: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const trackingId = searchParams.get('trackingId');

    if (!trackingId) {
      return new NextResponse("Tracking ID is required", { status: 400 });
    }

    // Find the order by tracking ID and store ID
    const order = await prismadb.order.findFirst({
      where: {
        trackingId: trackingId,
        storeId: params.storeId,
      },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                images: true
              }
            }
          }
        },
        trackingUpdates: {
          orderBy: {
            timestamp: 'desc'
          }
        }
      }
    });

    if (!order) {
      return new NextResponse("Order not found", { status: 404 });
    }

    // Transform the data to match your interface
    const transformedOrder = {
      id: order.id,
      customerName: order.customerName,
      phone: order.phone,
      address: order.address,
      county: order.county,
      customerEmail: order.customerEmail,
      trackingId: order.trackingId,
      deliveryStatus: order.deliveryStatus,
      isPaid: order.isPaid,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      orderItems: order.orderItems.map(item => ({
        id: item.id,
        quantity: item.quantity,
        product: {
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          images: item.product.images.map(img => ({ url: img.url }))
        }
      })),
      trackingUpdates: order.trackingUpdates.map(update => ({
        id: update.id,
        status: update.status,
        location: update.location,
        note: update.note,
        timestamp: update.timestamp
      }))
    };

    return NextResponse.json(transformedOrder);
  } catch (error) {
    console.log("[TRACK_ORDER_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
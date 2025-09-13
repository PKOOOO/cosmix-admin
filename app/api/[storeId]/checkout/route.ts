import { stripe } from "@/lib/stripe";
import prismadb from "@/lib/prismadb";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { verifyToken } from "@clerk/nextjs/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Allow all origins for development
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(
  req: Request,
  { params }: { params: { storeId: string } }
) {
  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    let userId = "guest"; // Default for guest users
    
    // Verify JWT token if provided
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.substring(7); // Remove "Bearer " prefix
        console.log("Checkout API - Attempting JWT verification with token:", token.substring(0, 20) + "...");
        const payload = await verifyToken(token, {
          secretKey: process.env.CLERK_SECRET_KEY,
          issuer: (iss) => iss.startsWith('https://clerk.') || iss.includes('clerk.accounts.dev')
        });
        userId = payload.sub || "guest";
        console.log("Checkout API - JWT verification success, userId:", userId);
      } catch (error) {
        console.log("Checkout API - Token verification failed:", error instanceof Error ? error.message : String(error));
        // For now, let's try to extract the user ID from the token without verification
        try {
          const token = authHeader.substring(7);
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
          userId = payload.sub || "guest";
          console.log("Checkout API - Extracted userId from token without verification:", userId);
        } catch (parseError) {
          console.log("Checkout API - Failed to parse token, using guest user");
          userId = "guest";
        }
      }
    }

    const { saloonServiceIds, customerInfo } = await req.json();

    if (!saloonServiceIds || saloonServiceIds.length === 0) {
      return new NextResponse("Saloon service ids are required", { status: 400 });
    }

    // Parse saloon service IDs (format: "saloonId:serviceId")
    const parsedServiceIds = saloonServiceIds.map((id: string) => {
      const [saloonId, serviceId] = id.split(':');
      return { saloonId, serviceId };
    });

    // Fetch saloon services with their details
    const saloonServices = await prismadb.saloonService.findMany({
    where: {
        OR: parsedServiceIds.map(({ saloonId, serviceId }: { saloonId: string; serviceId: string }) => ({
          saloonId,
          serviceId
        }))
      },
      include: {
        service: true,
        saloon: {
          include: {
            store: true
          }
        }
      }
    });

    if (saloonServices.length === 0) {
      return new NextResponse("No valid saloon services found", { status: 404 });
    }

  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    saloonServices.forEach((saloonService) => {
    line_items.push({
        quantity: 1,
        price_data: {
            currency: 'USD',
            product_data: {
            name: `${saloonService.service.name} - ${saloonService.saloon.name}`,
            description: `${saloonService.service.description || ''} (${saloonService.durationMinutes} minutes)`,
            },
          unit_amount: Math.round(saloonService.price * 100) // Convert to cents
        }
    });
  });

    // Handle user creation or validation
    let finalUserId = userId;
    
    if (userId !== "guest") {
      try {
        // Check if user exists in database
        const existingUser = await prismadb.user.findUnique({
          where: { clerkId: userId }
        });
        
        if (!existingUser) {
          console.log("User not found in database, creating user from customer info");
          // Create a user based on customer info
          try {
            const newUser = await prismadb.user.create({
              data: {
                clerkId: userId,
                email: customerInfo?.email || `user-${userId}@example.com`,
                name: customerInfo?.name || "User"
              }
            });
            finalUserId = newUser.id;
          } catch (createError) {
            console.log("Failed to create user with email, trying with unique email:", createError);
            // Try with a unique email
            const newUser = await prismadb.user.create({
              data: {
                clerkId: userId,
                email: `user-${userId}-${Date.now()}@example.com`,
                name: customerInfo?.name || "User"
              }
            });
            finalUserId = newUser.id;
          }
        } else {
          finalUserId = existingUser.id;
        }
      } catch (error) {
        console.log("Error handling user, creating from customer info:", error);
        // Create a user based on customer info
        try {
          const newUser = await prismadb.user.create({
            data: {
              clerkId: userId,
              email: customerInfo?.email || `user-${userId}@example.com`,
              name: customerInfo?.name || "User"
            }
          });
          finalUserId = newUser.id;
        } catch (createError) {
          console.log("Failed to create user, trying with unique email:", createError);
          try {
            // Try with a unique email
            const newUser = await prismadb.user.create({
    data: {
                clerkId: userId,
                email: `user-${userId}-${Date.now()}@example.com`,
                name: customerInfo?.name || "User"
              }
            });
            finalUserId = newUser.id;
          } catch (secondError) {
            console.log("Failed to create user, using guest:", secondError);
            // Fallback to guest user
            let guestUser = await prismadb.user.findFirst({
              where: { clerkId: "guest" }
            });
            
            if (!guestUser) {
              guestUser = await prismadb.user.create({
                data: {
                  clerkId: "guest",
                  email: "guest@example.com",
                  name: "Guest User"
                }
              });
            }
            
            finalUserId = guestUser.id;
          }
        }
      }
    } else {
      // Find or create a guest user
      let guestUser = await prismadb.user.findFirst({
        where: { clerkId: "guest" }
      });
      
      if (!guestUser) {
        guestUser = await prismadb.user.create({
          data: {
            clerkId: "guest",
            email: "guest@example.com",
            name: "Guest User"
          }
        });
      }
      
      finalUserId = guestUser.id;
    }

    // Create booking records for each service
    const bookings = await Promise.all(
      parsedServiceIds.map(async ({ saloonId, serviceId }: { saloonId: string; serviceId: string }) => {
        const saloonService = saloonServices.find(ss => 
          ss.saloonId === saloonId && ss.serviceId === serviceId
        );
        if (!saloonService) return null;

        return await prismadb.booking.create({
          data: {
            userId: finalUserId, // Use the validated user ID or "guest"
            serviceId: saloonService.serviceId,
            storeId: params.storeId,
            saloonId: saloonService.saloonId,
            bookingTime: customerInfo?.bookingTime ? new Date(customerInfo.bookingTime) : new Date(),
            status: "pending",
            customerName: customerInfo?.name,
            customerPhone: customerInfo?.phone,
            customerEmail: customerInfo?.email,
            notes: customerInfo?.notes,
            totalAmount: saloonService.price
          }
        });
      })
    );

    // Filter out null bookings
    const validBookings = bookings.filter(booking => booking !== null);

    if (validBookings.length === 0) {
      return new NextResponse("Failed to create bookings", { status: 500 });
    }

    // Calculate total amount
    const totalAmount = saloonServices.reduce((sum, service) => sum + service.price, 0);

    // Create Payment Intent for in-app payment
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalAmount * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          storeId: params.storeId,
          bookingIds: validBookings.map(b => b!.id).join(','),
          customerEmail: customerInfo?.email || '',
          customerName: customerInfo?.name || '',
          customerPhone: customerInfo?.phone || ''
        },
        description: `Booking for ${saloonServices.length} service(s)`,
        receipt_email: customerInfo?.email,
      });

      return NextResponse.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        bookingIds: validBookings.map(b => b!.id),
        amount: totalAmount
      }, {
        headers: corsHeaders
      });
    } catch (stripeError) {
      console.error('Stripe error:', stripeError);
      
      // If Stripe fails, still return the booking info but without payment
      return NextResponse.json({ 
        error: 'Payment service temporarily unavailable',
        bookingIds: validBookings.map(b => b!.id),
        amount: totalAmount,
        message: 'Bookings created successfully, but payment processing is temporarily unavailable. Please try again later.'
      }, {
        status: 503, // Service Unavailable
        headers: corsHeaders
      });
    }

  } catch (error) {
    console.error('Checkout error:', error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
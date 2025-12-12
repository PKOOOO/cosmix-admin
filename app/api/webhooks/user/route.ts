// app/api/webhooks/route.ts
import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { WebhookEvent } from "@clerk/nextjs/server";

import prismadb from "@/lib/prismadb";
import { ADMIN_EXTERNAL_ID } from "@/lib/service-auth";

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse("Error occured -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Get the Clerk webhook secret from the environment variables
  const whSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!whSecret) {
    throw new Error("You must add `CLERK_WEBHOOK_SECRET` to your .env file.");
  }

  // Create a new Svix instance with your secret.
  const wh = new Webhook(whSecret);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new NextResponse("Error occured", {
      status: 400,
    });
  }

  // Get the ID and type
  const eventType = evt.type;

  if (eventType === "user.created") {
    const { id, email_addresses, first_name, last_name } = evt.data;

    try {
      // Check if user already exists (in case post-sign-in page created them first)
      const existingUser = await prismadb.user.findUnique({
        where: { clerkId: id }
      });

      let user;
      if (existingUser) {
        // Update existing user with full details from webhook
        // IMPORTANT: Don't overwrite isAdmin if user already has it set
        // The admin status should be set by admin-access logic, not webhook
        const updateData: any = {
          email: email_addresses[0].email_address,
          name: `${first_name ?? ""} ${last_name ?? ""}`.trim() || "New User",
        };
        
        // Only set isAdmin if user doesn't have it set yet AND they're the first Clerk user
        if (!existingUser.isAdmin) {
          // Check admin count excluding service-admin user
          const adminCount = await prismadb.user.count({ 
            where: { 
              isAdmin: true,
              clerkId: { not: ADMIN_EXTERNAL_ID } // Exclude synthetic service user
            } 
          });
          if (adminCount === 0) {
            updateData.isAdmin = true;
            console.log("User updated and promoted to admin (first Clerk user):", existingUser.id);
          }
        }
        
        user = await prismadb.user.update({
          where: { clerkId: id },
          data: updateData,
        });
        console.log("User updated:", user.id, user.isAdmin ? "(Admin)" : "");
      } else {
        // Check if this is the first Clerk user (admin)
        // Exclude service-admin user from count
        const adminCount = await prismadb.user.count({ 
          where: { 
            isAdmin: true,
            clerkId: { not: ADMIN_EXTERNAL_ID } // Exclude synthetic service user
          } 
        });
        const isFirstUser = adminCount === 0;
        
        // Create a new user in your database
        user = await prismadb.user.create({
          data: {
            clerkId: id,
            email: email_addresses[0].email_address,
            name: `${first_name ?? ""} ${last_name ?? ""}`.trim() || "New User",
            isAdmin: isFirstUser, // Set admin status for first Clerk user
          },
        });
        console.log("User created:", user.id, isFirstUser ? "(Admin)" : "");
      }

    } catch (error) {
      console.error("Error creating user:", error);
      return new NextResponse("Error creating user", { status: 500 });
    }
  }

  return new NextResponse("", { status: 201 });
}

// import { Webhook } from "svix";
// import { headers } from "next/headers";
// import { NextResponse } from "next/server";
// import { WebhookEvent } from "@clerk/nextjs/server";

// import prismadb from "@/lib/prismadb";

// export async function POST(req: Request) {
//   // Get the headers
//   const headerPayload = headers();
//   const svix_id = headerPayload.get("svix-id");
//   const svix_timestamp = headerPayload.get("svix-timestamp");
//   const svix_signature = headerPayload.get("svix-signature");

//   // If there are no headers, error out
//   if (!svix_id || !svix_timestamp || !svix_signature) {
//     return new NextResponse("Error occured -- no svix headers", {
//       status: 400,
//     });
//   }

//   // Get the body
//   const payload = await req.json();
//   const body = JSON.stringify(payload);

//   // Get the Clerk webhook secret from the environment variables
//   const whSecret = process.env.CLERK_WEBHOOK_SECRET;

//   if (!whSecret) {
//     throw new Error("You must add `CLERK_WEBHOOK_SECRET` to your .env file.");
//   }

//   // Create a new Svix instance with your secret.
//   const wh = new Webhook(whSecret);

//   let evt: WebhookEvent;

//   // Verify the payload with the headers
//   try {
//     evt = wh.verify(body, {
//       "svix-id": svix_id,
//       "svix-timestamp": svix_timestamp,
//       "svix-signature": svix_signature,
//     }) as WebhookEvent;
//   } catch (err) {
//     console.error("Error verifying webhook:", err);
//     return new NextResponse("Error occured", {
//       status: 400,
//     });
//   }

//   // Get the ID and type
//   const eventType = evt.type;

//   if (eventType === "user.created") {
//     const { id, email_addresses, first_name, last_name } = evt.data;

//     // Create a new user in your database
//     await prismadb.user.create({
//       data: {
//         clerkId: id,
//         email: email_addresses[0].email_address,
//         name: `${first_name ?? ""} ${last_name ?? ""}`,
//       },
//     });
//   }

//   return new NextResponse("User created successfully.", { status: 201 });
// }
import { ensureServiceUser, isAuthorizedRequest } from "./service-auth";
import { auth, currentUser } from "@clerk/nextjs";
import { headers } from "next/headers";
import prismadb from "@/lib/prismadb";

// Simple JWT decode (no verification needed for public claims like userId)
function decodeJWT(token: string): { sub?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload;
  } catch {
    return null;
  }
}

export async function checkAdminAccess() {
  // Check for bearer token authentication first (from WebView)
  const isAuthorized = isAuthorizedRequest();
  let clerkUserId: string | null = null;
  
  if (isAuthorized) {
    // Extract Clerk user ID from X-User-Token header
    const headerPayload = headers();
    const clerkToken = headerPayload.get("x-user-token");
    
    if (clerkToken) {
      const decoded = decodeJWT(clerkToken);
      clerkUserId = decoded?.sub || null;
      console.log('[ADMIN_ACCESS] Clerk userId from bearer token:', clerkUserId);
    }
    
    // If bearer token is present but no Clerk token, check if it's service admin
    if (!clerkUserId) {
      const user = await ensureServiceUser();
      return { isAdmin: true, user };
    }
  }
  
  // Fall back to Clerk auth if no bearer token
  if (!clerkUserId) {
    try {
      const clerkAuth = auth();
      clerkUserId = clerkAuth?.userId || null;
      console.log('[ADMIN_ACCESS] Clerk userId from Clerk auth:', clerkUserId);
    } catch (error) {
      console.log('[ADMIN_ACCESS] Clerk auth failed:', error);
    }
  }

  // If no user ID found, deny access
  if (!clerkUserId) {
    console.log('[ADMIN_ACCESS] No user ID found, denying access');
    return { isAdmin: false, user: null };
  }

  // Check admin status for the Clerk user
  try {

    // Check admin count BEFORE creating user to avoid race conditions
    // Exclude service-admin user from count (only count real Clerk users)
    const adminCount = await prismadb.user.count({ 
        where: { 
            isAdmin: true,
            clerkId: { not: 'service-admin' } // Exclude synthetic service user
        } 
    });
    const shouldPromoteToAdmin = adminCount === 0;

    // Get user details from Clerk to get real email
    let clerkUserEmail = `${clerkUserId}@temp.local`;
    let clerkUserName = "New User";
    
    try {
      const clerkUser = await currentUser();
      if (clerkUser) {
        clerkUserEmail = clerkUser.emailAddresses[0]?.emailAddress || clerkUserEmail;
        clerkUserName = clerkUser.firstName && clerkUser.lastName 
          ? `${clerkUser.firstName} ${clerkUser.lastName}`.trim()
          : clerkUser.firstName || clerkUser.lastName || clerkUserEmail.split('@')[0] || "New User";
      }
    } catch (error) {
      console.log('[ADMIN_ACCESS] Could not fetch Clerk user details:', error);
    }

    // Find or create the Clerk user in DB
    let user = await prismadb.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!user) {
      try {
        user = await prismadb.user.create({
          data: {
            clerkId: clerkUserId,
            email: clerkUserEmail,
            name: clerkUserName,
            isAdmin: shouldPromoteToAdmin, // Set admin flag during creation
          },
        });
        console.log('[ADMIN_ACCESS] User created with isAdmin:', user.isAdmin, 'email:', user.email);
      } catch (createError: any) {
        // Handle unique constraint errors
        if (createError.code === 'P2002') {
          // Check if it's an email conflict
          if (createError.meta?.target?.includes('email')) {
            // User with this email already exists, try to find by email and update clerkId
            const existingUser = await prismadb.user.findUnique({
              where: { email: clerkUserEmail },
            });
            
            if (existingUser) {
              // Update existing user to link to this Clerk ID
              user = await prismadb.user.update({
                where: { email: clerkUserEmail },
                data: {
                  clerkId: clerkUserId,
                  name: clerkUserName,
                  // Don't change isAdmin if user already exists
                },
              });
              console.log('[ADMIN_ACCESS] Linked existing user to Clerk ID:', clerkUserId);
            } else {
              // Email conflict but user not found - try finding by clerkId
              user = await prismadb.user.findUnique({
                where: { clerkId: clerkUserId },
              });
            }
          } else {
            // ClerkId conflict - user already exists
            user = await prismadb.user.findUnique({
              where: { clerkId: clerkUserId },
            });
          }
          
          if (!user) {
            console.error("Failed to create or find user after conflict:", createError);
            return { isAdmin: false, user: null };
          }
        } else {
          throw createError;
        }
      }
    }

    // If user exists but wasn't promoted, check if they should be promoted
    if (user && !user.isAdmin) {
      // Recalculate admin count (excluding service-admin) to handle existing users
      const currentAdminCount = await prismadb.user.count({ 
        where: { 
          isAdmin: true,
          clerkId: { not: 'service-admin' } // Exclude synthetic service user
        } 
      });
      
      if (currentAdminCount === 0) {
        try {
          user = await prismadb.user.update({
            where: { id: user.id },
            data: { isAdmin: true },
          });
          console.log('[ADMIN_ACCESS] User promoted to admin');
        } catch (updateError) {
          // If update fails, refetch user
          user = await prismadb.user.findUnique({
            where: { clerkId: clerkUserId },
          });
        }
      }
    }

    console.log('[ADMIN_ACCESS] Returning isAdmin:', user?.isAdmin, 'for user:', user?.email);
    return { isAdmin: user?.isAdmin || false, user: user || null };
  } catch (error) {
    console.error("Error checking admin access:", error);
    return { isAdmin: false, user: null };
  }
}

export async function requireAdmin() {
  const { isAdmin, user } = await checkAdminAccess();
  
  if (!isAdmin) {
    throw new Error("Admin access required");
  }
  
  return user;
}

import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// This is the core Clerk authentication middleware.
const clerkAuthMiddleware = authMiddleware({
    publicRoutes: [
        "/sign-in(.*)",
        "/sign-up(.*)",
        "/reset-password(.*)",           // ← For password reset
        "/callback/stripe(.*)",          // ← Stripe callback routes
        "/sso(.*)",
        "/api/stores(.*)",
        "/api/categories(.*)",
        "/api/services(.*)",
        "/api/saloons(.*)",
        "/api/bookings(.*)",
        "/api/reviews(.*)",              // ← For rating submissions
        "/api/checkout(.*)",             // ← For checkout (payment flow)
        "/api/:storeId/categories(.*)",  // ← Keep for backward compatibility
        "/api/:storeId/services(.*)",    // ← Keep for backward compatibility
        "/api/:storeId/saloons(.*)",     // ← Keep for backward compatibility
        "/api/:storeId/bookings(.*)",    // ← Keep for backward compatibility
        "/api/:storeId/checkout(.*)",    // ← For checkout (payment flow)
        "/api/webhook(.*)",              // ← Allow webhooks (singular)
        "/api/webhooks(.*)",
        "/api/webhooks/paytrail(.*)",
        "/api/uploadthing(.*)",
    ],
    ignoredRoutes: [
        "/api/webhooks/user",
        "/api/uploadthing",
        "/api/:storeId/webhook"
    ],
    afterAuth(auth, req) {
        // If user is on root path
        if (req.nextUrl.pathname === '/') {
            if (!auth.userId) {
                // Not authenticated - redirect to sign-up
                const signUpUrl = new URL('/sign-up', req.url);
                return Response.redirect(signUpUrl);
            } else {
                // Authenticated - redirect to dashboard
                const dashboardUrl = new URL('/dashboard', req.url);
                return Response.redirect(dashboardUrl);
            }
        }

        // If user not signed in and route is protected, redirect to sign-up
        if (!auth.userId && !auth.isPublicRoute) {
            const signUpUrl = new URL('/sign-up', req.url);
            return Response.redirect(signUpUrl);
        }
    }
});

// A custom middleware function to apply CORS headers.
function withCors(middleware: any) {
    return (request: NextRequest) => {
        // Handle preflight OPTIONS requests separately.
        if (request.method === "OPTIONS") {
            const origin = request.headers.get("origin");
            const allowedOrigins = [
                process.env.FRONTEND_STORE_URL || "http://192.168.1.148:3001",
                "https://cosmix-admin.vercel.app",
                "http://192.168.1.148:3001",
                "http://192.168.1.145:3000",  // Local development server
                "http://localhost:8081",  // Expo development server
                "exp://192.168.1.148:8081",  // Expo on physical device
            ];
            const isAllowedOrigin = origin && allowedOrigins.includes(origin);
            const corsHeaders = {
                "Access-Control-Allow-Origin": isAllowedOrigin ? origin : allowedOrigins[0],
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, X-Requested-With, Origin",
                "Access-Control-Max-Age": "86400",
                "Access-Control-Allow-Credentials": "true",
            };
            return new NextResponse(null, { status: 204, headers: corsHeaders });
        }

        // Call Clerk's middleware.
        const response = middleware(request);

        // Check if the response is valid before trying to set headers.
        if (response instanceof NextResponse && request.nextUrl.pathname.startsWith("/api/")) {
            const origin = request.headers.get("origin");
            const allowedOrigins = [
                process.env.FRONTEND_STORE_URL || "http://192.168.1.148:3001",
                "https://cosmix-admin.vercel.app",
                "http://192.168.1.148:3001",
                "http://192.168.1.145:3000",  // Local development server
                "http://localhost:8081",  // Expo development server
                "exp://192.168.1.148:8081",  // Expo on physical device
            ];
            const isAllowedOrigin = origin && allowedOrigins.includes(origin);

            response.headers.set("Access-Control-Allow-Origin", isAllowedOrigin ? origin : allowedOrigins[0]);
            response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
            response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, X-Requested-With, Origin");
            response.headers.set("Access-Control-Allow-Credentials", "true");
            response.headers.set("Vary", "Origin, Access-Control-Request-Method, Access-Control-Request-Headers");
        }

        return response;
    };
}

export default withCors(clerkAuthMiddleware);

export const config = {
    matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
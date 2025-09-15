import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// This is the core Clerk authentication middleware.
const clerkAuthMiddleware = authMiddleware({
    publicRoutes: [
        "/",
        "/sign-in(.*)",
        "/sign-up(.*)",
        "/api/stores(.*)",
        "/api/categories(.*)",
        "/api/:storeId/categories(.*)",  // ← Correct Clerk syntax for dynamic routes
        "/api/:storeId/services(.*)",    // ← For services
        "/api/:storeId/saloons(.*)",     // ← For saloons (public access)
        "/api/:storeId/bookings(.*)",    // ← For bookings (already there)
        "/api/:storeId/checkout(.*)",    // ← For checkout (payment flow)
        "/api/webhooks(.*)",
        "/api/uploadthing(.*)",
    ],
    ignoredRoutes: [
        "/api/webhooks/user",
        "/api/uploadthing",
        "/api/:storeId/webhook"
    ]
});

// A custom middleware function to apply CORS headers.
function withCors(middleware: any) {
    return (request: NextRequest) => {
        // Handle preflight OPTIONS requests separately.
        if (request.method === "OPTIONS") {
            const origin = request.headers.get("origin");
            const allowedOrigins = [
                process.env.FRONTEND_STORE_URL || "http://192.168.1.148:3001",
                "http://192.168.1.148:3000",
                "http://192.168.1.148:3001",
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
                "http://192.168.1.148:3000",
                "http://192.168.1.148:3001",
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
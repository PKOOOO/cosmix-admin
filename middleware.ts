import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAuthorizedRequest } from "./lib/service-auth";

const allowedOrigins = [
    process.env.FRONTEND_STORE_URL || "http://192.168.1.148:3001",
    "https://cosmix-admin.vercel.app",
    "http://192.168.1.148:3001",
    "http://192.168.1.145:3000",  // Local development server
    "http://localhost:8081",      // Expo development server
    "exp://192.168.1.148:8081",   // Expo on physical device
];

const withCors = (handler: (request: NextRequest) => Promise<NextResponse | void> | (NextResponse | void)) => {
    return async (request: NextRequest) => {
        // Handle preflight OPTIONS requests separately.
        if (request.method === "OPTIONS") {
            const origin = request.headers.get("origin");
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

        const response = (await handler(request)) || NextResponse.next();

        if (response instanceof NextResponse && request.nextUrl.pathname.startsWith("/api/")) {
            const origin = request.headers.get("origin");
            const isAllowedOrigin = origin && allowedOrigins.includes(origin);
            response.headers.set("Access-Control-Allow-Origin", isAllowedOrigin ? origin : allowedOrigins[0]);
            response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
            response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, X-Requested-With, Origin");
            response.headers.set("Access-Control-Allow-Credentials", "true");
            response.headers.set("Vary", "Origin, Access-Control-Request-Method, Access-Control-Request-Headers");
        }

        return response;
    };
};

// Simple bearer-key middleware; no browser logins.
const bearerAuthMiddleware = async (req: NextRequest) => {
    const response = NextResponse.next();

    // **CRITICAL FIX**: Capture X-User-Token header and set as cookie
    // This persists auth across server-side redirects (where headers are lost)
    const userToken = req.headers.get("x-user-token");
    if (userToken) {
        response.cookies.set("x-user-token-session", userToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24, // 24 hours
            path: "/",
        });
    }

    const isApi = req.nextUrl.pathname.startsWith("/api/");
    const isPublic =
        req.nextUrl.pathname.startsWith("/public") ||
        req.nextUrl.pathname.startsWith("/favicon") ||
        req.nextUrl.pathname.startsWith("/api/public") ||
        req.nextUrl.pathname.startsWith("/sign-in") ||
        req.nextUrl.pathname.startsWith("/post-sign-in");

    // Allow public routes and pages (pages use Clerk auth, not bearer tokens)
    if (isPublic || !isApi) {
        return response;
    }

    // For API routes, require bearer token authentication
    if (!isAuthorizedRequest(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return response;
};

export default withCors(bearerAuthMiddleware);

export const config = {
    matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
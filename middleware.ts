import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAuthorizedRequest, ensureServiceUser } from "./lib/service-auth";

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
    const isApi = req.nextUrl.pathname.startsWith("/api/");
    const isPublic =
        req.nextUrl.pathname.startsWith("/public") ||
        req.nextUrl.pathname.startsWith("/favicon") ||
        req.nextUrl.pathname.startsWith("/api/public");

    if (isPublic) return NextResponse.next();

    if (!isAuthorizedRequest(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure synthetic admin user exists for downstream database lookups
    await ensureServiceUser();

    // Allow APIs and pages once authorized
    if (isApi) return NextResponse.next();
    return NextResponse.next();
};

export default withCors(bearerAuthMiddleware);

export const config = {
    matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
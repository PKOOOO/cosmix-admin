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
    // NOTE: httpOnly is FALSE so WebView JavaScript can update this cookie when users switch accounts
    const userToken = req.headers.get("x-user-token");
    if (userToken) {
        response.cookies.set("x-user-token-session", userToken, {
            httpOnly: false, // Must be false so JS can update on account switch!
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
    // BUT restrict dashboard pages to mobile app only
    const isDashboard = req.nextUrl.pathname.startsWith("/dashboard");

    if (isPublic) {
        return response;
    }

    // Restrict dashboard access to mobile app (WebView) only
    // The mobile app sends 'x-user-token' header on first load, and we set 'x-user-token-session' cookie
    if (isDashboard) {
        const userToken = req.headers.get("x-user-token");
        const sessionCookie = req.cookies.get("x-user-token-session");

        if (!userToken && !sessionCookie) {
            return new NextResponse(
                `<!DOCTYPE html>
                 <html>
                 <head>
                     <title>Access Restricted</title>
                     <meta name="viewport" content="width=device-width, initial-scale=1">
                     <style>
                         body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f4f4f5; color: #18181b; }
                         .container { text-align: center; padding: 2rem; background: white; border-radius: 1rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); max-width: 400px; margin: 1rem; }
                         h1 { font-size: 1.5rem; margin-bottom: 1rem; }
                         p { color: #52525b; line-height: 1.5; }
                     </style>
                 </head>
                 <body>
                     <div class="container">
                         <h1>Access Restricted</h1>
                         <p>This dashboard is only accessible via the Cosmix mobile app.</p>
                     </div>
                 </body>
                 </html>`,
                {
                    status: 403,
                    headers: { "Content-Type": "text/html" }
                }
            );
        }
    }

    // For API routes, require bearer token authentication
    if (isApi) {
        if (!isAuthorizedRequest(req)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    }

    return response;
};

export default withCors(bearerAuthMiddleware);

export const config = {
    matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
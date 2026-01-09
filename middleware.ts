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
                "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, X-Requested-With, Origin, X-User-Token",
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
            response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, X-Requested-With, Origin, X-User-Token");
            response.headers.set("Access-Control-Allow-Credentials", "true");
            response.headers.set("Vary", "Origin, Access-Control-Request-Method, Access-Control-Request-Headers");
        }

        return response;
    };
};

/**
 * SECURITY: Basic JWT structure validation (NOT verification!)
 * This just checks if the token LOOKS like a valid JWT format.
 * Real verification happens in the page/API routes using Clerk's verifyToken.
 * This is just a first line of defense to reject obviously fake tokens.
 */
function looksLikeValidJWT(token: string): boolean {
    // JWT must have exactly 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) {
        return false;
    }

    // Each part must be base64url encoded (non-empty)
    for (const part of parts) {
        if (!part || part.length === 0) {
            return false;
        }
        // Basic check: should only contain base64url characters
        if (!/^[A-Za-z0-9_-]+$/.test(part)) {
            return false;
        }
    }

    // Try to decode the payload (middle part) to check it's valid JSON
    try {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
        // Must have a 'sub' (subject) claim
        if (!payload.sub || typeof payload.sub !== 'string') {
            return false;
        }
        // NOTE: We intentionally do NOT check expiration here.
        // Clerk's verifyToken in the route handlers will properly check expiration
        // with clock skew tolerance. Our middleware just validates format.
        return true;
    } catch {
        return false;
    }
}

// Simple bearer-key middleware; no browser logins.
const bearerAuthMiddleware = async (req: NextRequest) => {
    const response = NextResponse.next();

    // **CRITICAL FIX**: Capture X-User-Token header and set as cookie
    // This persists auth across server-side redirects (where headers are lost)
    // NOTE: httpOnly is FALSE so WebView JavaScript can update this cookie when users switch accounts
    const userToken = req.headers.get("x-user-token");
    if (userToken) {
        // SECURITY: Only set cookie if token looks like a valid JWT
        if (looksLikeValidJWT(userToken)) {
            response.cookies.set("x-user-token-session", userToken, {
                httpOnly: false, // Must be false so JS can update on account switch!
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 60 * 60 * 24, // 24 hours
                path: "/",
            });
        } else {
            console.log('[MIDDLEWARE] Invalid JWT format in x-user-token header, rejecting');
            // Don't set cookie for invalid tokens
        }
    }

    const isApi = req.nextUrl.pathname.startsWith("/api/");
    const isPublic =
        req.nextUrl.pathname.startsWith("/public") ||
        req.nextUrl.pathname.startsWith("/favicon") ||
        req.nextUrl.pathname.startsWith("/api/public") ||
        req.nextUrl.pathname.startsWith("/sign-in") ||
        req.nextUrl.pathname.startsWith("/post-sign-in");

    // Allow public routes and pages (pages use Clerk auth, not bearer tokens)
    // BUT restrict dashboard and admin pages to mobile app only
    const isDashboard = req.nextUrl.pathname.startsWith("/dashboard");
    const isAdmin = req.nextUrl.pathname.startsWith("/admin");
    const isRestrictedPage = isDashboard || isAdmin;

    if (isPublic) {
        return response;
    }

    // Restrict dashboard/admin access to mobile app (WebView) only
    // The mobile app sends 'x-user-token' header on first load, and we set 'x-user-token-session' cookie
    if (isRestrictedPage) {
        const userToken = req.headers.get("x-user-token");
        const sessionCookie = req.cookies.get("x-user-token-session")?.value;
        const hasBearerToken = isAuthorizedRequest(req);

        // SECURITY: If NO token or cookie at all, block access
        if (!userToken && !sessionCookie) {
            console.log('[MIDDLEWARE] No auth tokens found, blocking access');
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

        // SECURITY: If user token is provided, validate its format
        // Note: Full cryptographic verification happens in the page/API routes
        const tokenToValidate = userToken || sessionCookie;
        if (tokenToValidate && !looksLikeValidJWT(tokenToValidate)) {
            console.log('[MIDDLEWARE] SECURITY: Invalid JWT format detected, blocking access');
            return new NextResponse(
                `<!DOCTYPE html>
                 <html>
                 <head>
                     <title>Invalid Token</title>
                     <meta name="viewport" content="width=device-width, initial-scale=1">
                     <style>
                         body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fee; color: #18181b; }
                         .container { text-align: center; padding: 2rem; background: white; border-radius: 1rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); max-width: 400px; margin: 1rem; }
                         h1 { font-size: 1.5rem; margin-bottom: 1rem; color: #991b1b; }
                         p { color: #52525b; line-height: 1.5; }
                     </style>
                 </head>
                 <body>
                     <div class="container">
                         <h1>Authentication Failed</h1>
                         <p>Your authentication token is invalid. Please sign in again through the mobile app.</p>
                     </div>
                 </body>
                 </html>`,
                {
                    status: 401,
                    headers: { "Content-Type": "text/html" }
                }
            );
        }

        // Token format is valid - request will proceed to route handler
        // Full cryptographic verification happens there using Clerk's verifyToken
        console.log('[MIDDLEWARE] Valid JWT format, proceeding to route handler for verification');
    }

    // For API routes, require authentication (bearer token OR user session cookie)
    // Bearer token is used for initial WebView requests, but subsequent API calls
    // from within the page use the x-user-token-session cookie for authentication
    if (isApi) {
        const hasUserSessionCookie = req.cookies.get("x-user-token-session");
        const hasBearerToken = isAuthorizedRequest(req);

        if (!hasBearerToken && !hasUserSessionCookie) {
            console.log('[MIDDLEWARE] API access denied - no bearer token or session cookie');
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // SECURITY: If there's a user token cookie but no bearer token, validate the JWT format
        if (hasUserSessionCookie && !hasBearerToken) {
            if (!looksLikeValidJWT(hasUserSessionCookie.value)) {
                console.log('[MIDDLEWARE] API access denied - invalid JWT format in cookie');
                return NextResponse.json({ error: "Invalid token" }, { status: 401 });
            }
        }
    }

    return response;
};

export default withCors(bearerAuthMiddleware);

export const config = {
    matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
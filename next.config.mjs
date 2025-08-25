// /** @type {import('next').NextConfig} */
// const nextConfig = {
//     images: {
//       domains: ["res.cloudinary.com"],
//     },
//     experimental: {
//         serverActions: true, // If you're using Server Actions, keep this
//       },
//       output: "standalone", // Ensures a full Node.js environment
//       runtime: "nodejs", // Enforces Node.js runtime
//   };
  
//   export default nextConfig;
  
/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: ["res.cloudinary.com"],
    },
    experimental: {
        serverActions: true,
    },
    output: "standalone",
    
    // Global CORS headers for all API routes
    async headers() {
        return [
            {
                // Apply CORS headers to all API routes
                source: "/api/:path*",
                headers: [
                    {
                        key: "Access-Control-Allow-Origin",
                        value: process.env.FRONTEND_STORE_URL || "http://192.168.1.145:3001",
                    },
                    {
                        key: "Access-Control-Allow-Methods",
                        value: "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    },
                    {
                        key: "Access-Control-Allow-Headers",
                        value: "Content-Type, Authorization, Accept, X-Requested-With, Origin",
                    },
                    {
                        key: "Access-Control-Max-Age",
                        value: "86400", // 24 hours
                    },
                    {
                        key: "Vary",
                        value: "Origin, Access-Control-Request-Method, Access-Control-Request-Headers",
                    },
                ],
            },
        ];
    },

    // Optional: Add redirects for better development experience
    async redirects() {
        return [
            // Add any redirects you need here
        ];
    },

    // Optional: Add rewrites if you need to proxy requests
    async rewrites() {
        return {
            beforeFiles: [
                // Add any rewrites you need here
            ],
            afterFiles: [
                // These rewrites are checked after pages/public files
            ],
            fallback: [
                // These rewrites are checked after both routes/pages and public files
            ],
        };
    },

    // Environment variables validation (optional)
    env: {
        CUSTOM_KEY: process.env.CUSTOM_KEY,
    },

    // Webpack configuration (if needed)
    webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
        // Important: return the modified config
        return config;
    },

    // TypeScript configuration
    typescript: {
        // Only use this if you want to ignore TypeScript errors during build
        // ignoreBuildErrors: false,
    },

    // ESLint configuration
    eslint: {
        // Only use this if you want to ignore ESLint errors during build
        // ignoreDuringBuilds: false,
    },

    // Compiler options
    compiler: {
        // Remove console logs in production
        removeConsole: process.env.NODE_ENV === "production",
    },

    // Experimental features
    experimental: {
        // Server Actions
        serverActions: true,
        // App Directory (if using)
        appDir: true,
    },

    // Security headers
    async headers() {
        return [
            {
                source: "/api/:path*",
                headers: [
                    // CORS headers
                    {
                        key: "Access-Control-Allow-Origin",
                        value: process.env.FRONTEND_STORE_URL || "http://192.168.1.145:3001",
                    },
                    {
                        key: "Access-Control-Allow-Methods",
                        value: "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    },
                    {
                        key: "Access-Control-Allow-Headers",
                        value: "Content-Type, Authorization, Accept, X-Requested-With, Origin",
                    },
                    {
                        key: "Access-Control-Max-Age",
                        value: "86400",
                    },
                    {
                        key: "Vary",
                        value: "Origin, Access-Control-Request-Method, Access-Control-Request-Headers",
                    },
                    // Security headers
                    {
                        key: "X-DNS-Prefetch-Control",
                        value: "on"
                    },
                    {
                        key: "X-XSS-Protection",
                        value: "1; mode=block"
                    },
                    {
                        key: "X-Frame-Options",
                        value: "SAMEORIGIN"
                    },
                    {
                        key: "X-Content-Type-Options",
                        value: "nosniff"
                    },
                    {
                        key: "Referrer-Policy",
                        value: "origin-when-cross-origin"
                    }
                ],
            },
            {
                // Apply security headers to all routes
                source: "/(.*)",
                headers: [
                    {
                        key: "X-DNS-Prefetch-Control",
                        value: "on"
                    },
                    {
                        key: "X-XSS-Protection",
                        value: "1; mode=block"
                    },
                    {
                        key: "X-Frame-Options",
                        value: "SAMEORIGIN"
                    },
                    {
                        key: "X-Content-Type-Options",
                        value: "nosniff"
                    },
                    {
                        key: "Referrer-Policy",
                        value: "origin-when-cross-origin"
                    }
                ],
            },
        ];
    },
};

export default nextConfig;
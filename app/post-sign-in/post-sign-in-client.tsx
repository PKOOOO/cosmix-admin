// app/post-sign-in/post-sign-in-client.tsx

"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

export const PostSignInClient = () => {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Prevent multiple redirects
    if (hasRedirected.current) {
      console.log('[PostSignInClient] Already redirected, skipping');
      return;
    }

    // Check if we're already on the saloons page
    if (typeof window !== 'undefined' && window.location.pathname === '/dashboard/saloons') {
      console.log('[PostSignInClient] Already on saloons page, skipping redirect');
      return;
    }

    // Add a small delay to ensure user creation is complete
    const timer = setTimeout(() => {
      if (hasRedirected.current) return;
      
      setIsRedirecting(true);
      hasRedirected.current = true;
      console.log('[PostSignInClient] Redirecting to /dashboard/saloons');
      
      // Try Next.js router first (works better in WebView)
      try {
        router.push('/dashboard/saloons');
        // Fallback to window.location if router doesn't work
        setTimeout(() => {
          if (window.location.pathname === '/post-sign-in' && !hasRedirected.current) {
            console.log('[PostSignInClient] Router push failed, using window.location');
            window.location.href = '/dashboard/saloons';
          }
        }, 500);
      } catch (error) {
        console.error('[PostSignInClient] Error redirecting:', error);
        // Fallback to hard navigation
        if (!hasRedirected.current) {
          window.location.href = '/dashboard/saloons';
        }
      }
    }, 1500); // Slightly longer delay to ensure everything is ready

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-4">Welcome!</h1>
        <p className="text-muted-foreground">
          {isRedirecting
            ? "Redirecting you to create your first saloon..."
            : "Setting up your account..."
          }
        </p>
        {!isRedirecting && (
          <div className="mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          </div>
        )}
      </div>
    </div>
  );
};
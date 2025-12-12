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
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (currentPath === '/dashboard/saloons' || currentPath.startsWith('/dashboard')) {
        console.log('[PostSignInClient] Already on dashboard, skipping redirect');
        hasRedirected.current = true;
        return;
      }
    }

    // Add a small delay to ensure user creation is complete
    const timer = setTimeout(() => {
      if (hasRedirected.current) return;
      
      // Double-check we're still on post-sign-in before redirecting
      if (typeof window !== 'undefined' && window.location.pathname !== '/post-sign-in') {
        console.log('[PostSignInClient] No longer on post-sign-in, skipping redirect');
        hasRedirected.current = true;
        return;
      }
      
      setIsRedirecting(true);
      hasRedirected.current = true;
      console.log('[PostSignInClient] Redirecting to /dashboard/saloons');
      
      // Use window.location for more reliable navigation in WebView
      window.location.href = '/dashboard/saloons';
    }, 2000); // Longer delay to ensure user creation and page stability

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
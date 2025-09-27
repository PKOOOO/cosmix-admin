// app/post-sign-in/post-sign-in-client.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export const PostSignInClient = () => {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Add a small delay to ensure user creation is complete
    const timer = setTimeout(() => {
      setIsRedirecting(true);
      router.push('/dashboard/saloons');
    }, 1000); // 1 second delay

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
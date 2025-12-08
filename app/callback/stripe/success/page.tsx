"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function StripeSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // Small delay to show the spinner, then redirect
    const timer = setTimeout(() => {
      router.replace("/dashboard/integration");
    }, 1500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <div className="text-center">
        <h2 className="text-xl font-semibold">Stripe Connected Successfully!</h2>
        <p className="text-muted-foreground mt-2">Redirecting you back...</p>
      </div>
    </div>
  );
}


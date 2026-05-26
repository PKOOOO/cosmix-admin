"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { loadConnectAndInitialize, StripeConnectInstance } from "@stripe/connect-js";
import {
  ConnectComponentsProvider,
  ConnectAccountOnboarding,
} from "@stripe/react-connect-js";

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage(message: string): void;
    };
  }
}

function EmbedOnboardingInner() {
  const searchParams = useSearchParams();
  const accountId = searchParams.get("accountId");
  const [stripeConnectInstance, setStripeConnectInstance] = useState<StripeConnectInstance | null>(null);

  useEffect(() => {
    if (!accountId) return;

    const fetchClientSecret = async () => {
      const res = await fetch("/api/stripe/account-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      const data = await res.json();
      return data.clientSecret;
    };

    const instance = loadConnectAndInitialize({
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISH_KEY!,
      fetchClientSecret,
      appearance: {
        variables: {
          colorPrimary: "#423120",
          fontFamily: "system-ui, sans-serif",
        },
      },
    });

    setStripeConnectInstance(instance);
  }, [accountId]);

  const handleExit = () => {
    if (typeof window !== "undefined" && window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage("onboarding_exit");
    }
  };

  if (!accountId) {
    return <div style={{ padding: 20 }}>Missing accountId parameter</div>;
  }

  if (!stripeConnectInstance) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: 0,
        overflow: "hidden",
      }}
    >
      <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
        <ConnectAccountOnboarding onExit={handleExit} />
      </ConnectComponentsProvider>
    </div>
  );
}

export default function EmbedOnboarding() {
  return (
    <Suspense fallback={<div style={{ padding: 20 }}>Loading...</div>}>
      <EmbedOnboardingInner />
    </Suspense>
  );
}

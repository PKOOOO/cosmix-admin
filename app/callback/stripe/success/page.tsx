"use client";

import { useEffect } from "react";

// Stripe Connect onboarding sends the provider here when onboarding is finished (or left for later).
// It hands control back to the Kosmiks app, which closes the browser and refreshes the payout status.
const APP_URL = "kosmiks://stripe-return?result=success";

export default function StripeSuccessPage() {
  useEffect(() => {
    window.location.href = APP_URL;
  }, []);

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Georgia, serif", background: "#F8F4EF", color: "#423120", textAlign: "center" }}>
      <div>
        <h1 style={{ fontSize: 22, marginBottom: 12 }}>Stripe setup saved</h1>
        <p style={{ marginBottom: 24 }}>Returning to the Kosmiks app…</p>
        <a href={APP_URL} style={{ display: "inline-block", padding: "12px 24px", borderRadius: 24, background: "#423120", color: "#FFFFFF", textDecoration: "none" }}>
          Open Kosmiks
        </a>
      </div>
    </main>
  );
}

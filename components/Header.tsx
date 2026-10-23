// components/Header.tsx
//
// The web tier is API-only. This used to render Clerk's <SignIn> widget for a
// browser sign-in flow that no longer exists — there is no ClerkProvider, no
// /post-sign-in route, and no dashboard to sign in to. Identity is handled
// entirely by the mobile app via Clerk, and verified server-side against
// X-User-Token. This is a static placeholder so `/` resolves to something.
// It links /privacy because Google's OAuth consent screen checks for it.

import Link from "next/link"

export function Header() {
  return (
    <header className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Kosmiks</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Book beauty and wellness services in Finland. Download the Kosmiks mobile app to get
          started.
        </p>
        <Link href="/privacy" className="mt-4 inline-block text-sm underline">
          Privacy Policy
        </Link>
      </div>
    </header>
  )
}

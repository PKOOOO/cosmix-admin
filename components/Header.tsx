// components/Header.tsx
//
// The web tier is API-only. This used to render Clerk's <SignIn> widget for a
// browser sign-in flow that no longer exists — there is no ClerkProvider, no
// /post-sign-in route, and no dashboard to sign in to. Identity is handled
// entirely by the mobile app via Clerk, and verified server-side against
// X-User-Token. This is a static placeholder so `/` resolves to something.

export function Header() {
  return (
    <header className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Servey</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This host serves the Servey API. There is no web interface — please use
          the mobile app.
        </p>
      </div>
    </header>
  )
}

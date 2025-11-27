// app/components/Header.tsx
import { SignedIn, SignedOut, SignIn, UserButton } from '@clerk/nextjs'
import Link from 'next/link'

export function Header() {
  return (
    <header className="flex items-center justify-center min-h-screen p-4">
      <div>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>

        <SignedOut>
          <SignIn
            redirectUrl="/post-sign-in"
          />
        </SignedOut>
      </div>
    </header>
  )
}
// app/components/Header.tsx
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { Button } from './ui/button'
import { HeartIcon, ShoppingCart } from 'lucide-react'

export function Header() {
  return (
    <header className="flex items-center justify-between p-4 border-b border-gray-200">
      <div>
        <Link href="/">
          <h2>Creator site</h2>
        </Link>
      </div>

      <div>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
        
        <SignedOut>
          <Button
            asChild
            variant="outline"
            className="px-4 py-2 bg-gray-800 text-white rounded-lg"
          >
            <div>
              <SignInButton 
                mode="modal"
                redirectUrl="/post-sign-in"  // Special route for handling redirects
              />
              <ShoppingCart className="w-4 ml-2 h-4" />
            </div>
          </Button>
        </SignedOut>
      </div>
    </header>
  )
}
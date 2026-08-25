import { Header } from '@/components/Header'
import React from 'react'

// The web tier is API-only: there is no dashboard to redirect into, and no
// browser-facing sign-in. This is the landing page and the only thing here.
async function page() {
  return (
    <Header />
  )
}

export default page

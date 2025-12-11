import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { Header } from '@/components/Header'
import React from 'react'

async function page() {
  const { userId } = auth();

  // If user is authenticated, redirect to dashboard
  if (userId) {
    redirect('/dashboard');
  }

  // If not authenticated, show landing pagee
  return (
    <Header />
  )
}

export default page

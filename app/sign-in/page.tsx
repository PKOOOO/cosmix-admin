'use client'
import SignInFormProvider, { useSignInContext } from '@/components/forms/sign-in/form-provider'
import LoginForm from '@/components/forms/sign-in/login-form'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import React from 'react'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

const SignInPage = () => {
    return (
        <div className="flex-1 py-12 md:py-24 px-4 w-full">
            <div className="flex flex-col h-full gap-3 max-w-md mx-auto">
                <SignInFormProvider>
                    <SignInView />
                </SignInFormProvider>
            </div>
        </div>
    )
}

const SignInView = () => {
    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col gap-2 text-center">
                <h1 className="text-3xl font-bold tracking-tight">
                    Tervetuloa takaisin
                </h1>
                <p className="text-muted-foreground">
                    Kirjaudu sisään jatkaaksesi
                </p>
            </div>

            {/* Form Content */}
            <LoginForm />
            <SignInButtonHandler />
        </div>
    )
}

const SignInButtonHandler = () => {
    const { loading, needsSecondFactor } = useSignInContext()
    const router = useRouter()

    if (needsSecondFactor) {
        return null // OTP UI handled in LoginForm
    }

    const handleForgotPassword = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        // Use window.location for a hard navigation
        window.location.href = '/reset-password'
    }

    return (
        <div className="w-full flex flex-col gap-4">
            {/* Forgot Password Link - Outside form context */}
            <div className="text-right">
                <a
                    href="/reset-password"
                    onClick={handleForgotPassword}
                    className="text-sm text-primary hover:underline cursor-pointer"
                >
                    Unohditko salasanan?
                </a>
            </div>

            {/* Submit Button */}
            <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading}
            >
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Kirjaudutaan sisään...
                    </>
                ) : (
                    'Kirjaudu sisään'
                )}
            </Button>

            {/* Divider */}
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                        Tai
                    </span>
                </div>
            </div>

            {/* Sign Up Link */}
            <p className="text-center text-sm text-muted-foreground">
                Eikö sinulla ole tiliä?{' '}
                <Link
                    href="/sign-up"
                    className="font-semibold text-primary hover:underline"
                >
                    Rekisteröidy
                </Link>
            </p>
        </div>
    )
}

export default SignInPage
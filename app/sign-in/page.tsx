'use client'
import SignInFormProvider, { useSignInContext } from '@/components/forms/sign-in/form-provider'
import LoginForm from '@/components/forms/sign-in/login-form'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import React, { useState } from 'react'
import { Loader2 } from 'lucide-react'

// Create a wrapper component to consume the context
const SignInContent = () => {
    const { loading, needsSecondFactor, onVerifyOTP } = useSignInContext()

    // We need access to the OTP value from LoginForm if we want the button here.
    // OR, we can move the button into LoginForm for the OTP state?
    // OR, we can use a portal?
    // Simplest: The button in page.tsx triggers form submit.
    // If needsSecondFactor is true, the form submit handler in use-sign-in.ts (onHandleSubmit)
    // is still attached to the <form>.
    // We can modify onHandleSubmit to check needsSecondFactor and call onVerifyOTP if so.
    // BUT, onVerifyOTP needs the 'otp' value which is local state in LoginForm.

    // BETTER APPROACH:
    // Move the Button INTO LoginForm or a new component inside the provider.

    return (
        <div className="flex flex-col gap-3">
            <LoginForm />
            <div className="w-full flex flex-col gap-3 items-center">
                {!needsSecondFactor ? (
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={loading}
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </Button>
                ) : (
                    <Button
                        type="button" // Don't submit the main form
                        className="w-full"
                        disabled={loading}
                        onClick={() => {
                            // How to get OTP?
                            // We can't easily get it from here if it's state in LoginForm.
                            // Let's rely on LoginForm to render its own button for OTP.
                            // So we hide this button if needsSecondFactor is true.
                        }}
                    >
                        Verify (Click inside)
                    </Button>
                )}

                <p>
                    Don’t have an account?{' '}
                    <Link
                        href="/sign-up"
                        className="font-bold"
                    >
                        Create one
                    </Link>
                </p>
            </div>
        </div>
    )
}

const SignInPage = () => {
    return (
        <div className="flex-1 py-36 md:px-16 w-full">
            <div className="flex flex-col h-full gap-3">
                <SignInFormProvider>
                    <SignInView />
                </SignInFormProvider>
            </div>
        </div>
    )
}

const SignInView = () => {
    const { loading, needsSecondFactor, onVerifyOTP } = useSignInContext()
    // We need to lift the OTP state up to here or context if we want the button here.
    // Let's modify SignInFormProvider to hold OTP state? No, that's getting messy.

    // Let's just put the Button inside LoginForm for the OTP case.
    // And for the normal case, we can keep it here?
    // Or just put everything in LoginForm?

    // Let's move the Button logic into a new component `SignInButtonHandler` similar to sign-up.

    return (
        <div className="flex flex-col gap-3">
            <LoginForm />
            <SignInButtonHandler />
        </div>
    )
}

const SignInButtonHandler = () => {
    const { loading, needsSecondFactor, onVerifyOTP } = useSignInContext()

    if (needsSecondFactor) {
        // The button is rendered inside LoginForm for OTP to access state?
        // Or we use a ref?
        // Let's just render NOTHING here and let LoginForm handle the OTP UI + Button.
        return null
    }

    return (
        <div className="w-full flex flex-col gap-3 items-center px-4">
            <Button
                type="submit"
                className="w-full max-w-md"
                disabled={loading}
            >
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />

                    </>
                ) : (
                    'Kirjaudu sisään'
                )}
            </Button>
            <p>
                Eikö sinulla ole tiliä?{' '}
                <Link
                    href="/sign-up"
                    className="font-extrabold underline text-lg"
                >
                    rekisteröidy
                </Link>
            </p>
        </div>
    )
}

export default SignInPage

'use client'
import { Button } from '@/components/ui/button'
import { useAuthContextHook } from '@/context/use-auth-context'
import { useSignUpForm } from '@/hooks/sign-up/use-sign-up'
import Link from 'next/link'
import React from 'react'
import { useFormContext } from 'react-hook-form'
import { Loader2 } from 'lucide-react'

type Props = {}

const ButtonHandler = (props: Props) => {
    const { setCurrentStep, currentStep } = useAuthContextHook()
    const { getValues, trigger } = useFormContext()
    const { onGenerateOTP, loading } = useSignUpForm()

    if (currentStep === 2) {
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
                            Creating account...
                        </>
                    ) : (
                        'Create an account'
                    )}
                </Button>
                <p>
                    Already have an account?
                    <Link
                        href="/sign-in"
                        className="font-extrabold underline text-lg"
                    >
                        Sign In
                    </Link>
                </p>
            </div>
        )
    }

    if (currentStep === 1) {
        return (
            <div className="w-full flex flex-col gap-3 items-center px-4">
                <Button
                    type="button"
                    className="w-full max-w-md"
                    disabled={loading}
                    onClick={async () => {
                        const isValid = await trigger(['email', 'confirmEmail', 'password', 'confirmPassword'])
                        if (isValid) {
                            onGenerateOTP(
                                getValues('email'),
                                getValues('password'),
                                setCurrentStep
                            )
                        }
                    }}
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            OTP:n lähettäminen
                        </>
                    ) : (
                        'Jatkaa'
                    )}
                </Button>
                <p>
                    Onko sinulla jo tili?{' '}
                    <Link
                        href="/sign-in"
                        className="font-extrabold underline text-lg"
                    >
                        Kirjaudu sisään
                    </Link>
                </p>
            </div>
        )
    }

    return null
}

export default ButtonHandler

'use client'
import { AuthContextProvider } from '@/context/use-auth-context'
import { useSignInForm } from '@/hooks/sign-in/use-sign-in'
import React, { createContext, useContext } from 'react'
import { FormProvider } from 'react-hook-form'

type SignInContextType = {
    loading: boolean
    needsSecondFactor: boolean
    onVerifyOTP: (otp: string) => Promise<void>
}

const SignInContext = createContext<SignInContextType | null>(null)

export const useSignInContext = () => {
    const context = useContext(SignInContext)
    if (!context) {
        throw new Error('useSignInContext must be used within a SignInFormProvider')
    }
    return context
}

type Props = {
    children: React.ReactNode
}

const SignInFormProvider = ({ children }: Props) => {
    const { methods, onHandleSubmit, loading, needsSecondFactor, onVerifyOTP } = useSignInForm()

    return (
        <AuthContextProvider>
            <SignInContext.Provider value={{ loading, needsSecondFactor, onVerifyOTP }}>
                <FormProvider {...methods}>
                    <form
                        onSubmit={onHandleSubmit}
                        className="h-full"
                    >
                        <div className="flex flex-col justify-between gap-3 h-full">
                            {children}
                        </div>
                    </form>
                </FormProvider>
            </SignInContext.Provider>
        </AuthContextProvider>
    )
}

export default SignInFormProvider

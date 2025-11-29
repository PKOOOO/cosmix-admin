'use client'

import { toast } from 'react-hot-toast'
import { useSignUp } from "@clerk/nextjs"
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from "react"
import { useForm } from "react-hook-form"
import { UserRegistrationProps, UserRegistrationSchema } from "@/schemas/auth.schemas"
import { useRouter } from "next/navigation"

export const useSignUpForm = () => {
    const [loading, setLoading] = useState<boolean>(false)
    const { signUp, isLoaded, setActive } = useSignUp()
    const router = useRouter()
    const methods = useForm<UserRegistrationProps>({
        resolver: zodResolver(UserRegistrationSchema),
        mode: 'onChange',
    })

    const onGenerateOTP = async (
        email: string,
        password: string,
        onNext: React.Dispatch<React.SetStateAction<number>>
    ) => {
        if (!isLoaded) return

        try {
            setLoading(true)
            console.log('Attempting sign up with:', { email })
            await signUp.create({
                emailAddress: email,
                password: password,
            })

            await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })

            onNext((prev) => prev + 1)
            setLoading(false)
        } catch (error: any) {
            setLoading(false)
            if (error.errors && error.errors[0]) {
                toast.error(error.errors[0].longMessage)
            } else {
                toast.error('An error occurred during sign up.')
            }
        }
    }

    const onHandleSubmit = methods.handleSubmit(
        async (values: UserRegistrationProps) => {
            if (!isLoaded) return

            try {
                setLoading(true)
                const completeSignUp = await signUp.attemptEmailAddressVerification({
                    code: values.otp,
                })

                if (completeSignUp.status !== 'complete') {
                    setLoading(false)
                    toast.error('Verification failed. Please try again.')
                    return
                }

                if (completeSignUp.status === 'complete') {
                    await setActive({
                        session: completeSignUp.createdSessionId,
                    })

                    setLoading(false)
                    toast.success('Account created successfully!')
                    router.push('/dashboard')
                }
            } catch (error: any) {
                setLoading(false)
                if (error.errors && error.errors[0]) {
                    toast.error(error.errors[0].longMessage)
                } else {
                    toast.error('An error occurred during verification.')
                }
            }
        }
    )
    return {
        methods,
        onHandleSubmit,
        onGenerateOTP,
        loading,
    }
}

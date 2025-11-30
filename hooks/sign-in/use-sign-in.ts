import { toast } from 'react-hot-toast'
import { UserLoginProps, UserLoginSchema } from '@/schemas/auth.schemas'
import { useSignIn } from '@clerk/nextjs'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

export const useSignInForm = () => {
    const { isLoaded, setActive, signIn } = useSignIn()
    const [loading, setLoading] = useState<boolean>(false)
    const [isSuccess, setIsSuccess] = useState<boolean>(false)
    const [needsSecondFactor, setNeedsSecondFactor] = useState<boolean>(false)
    const router = useRouter()

    const methods = useForm<UserLoginProps>({
        resolver: zodResolver(UserLoginSchema),
        mode: 'onChange',
    })

    const onHandleSubmit = methods.handleSubmit(
        async (values: UserLoginProps) => {
            if (!isLoaded) return

            try {
                setLoading(true)
                const result = await signIn.create({
                    identifier: values.email,
                    password: values.password,
                })

                if (result.status === 'complete') {
                    await setActive({ session: result.createdSessionId })
                    setIsSuccess(true)
                    methods.reset()
                    router.push('/dashboard')
                    router.refresh()
                } else if (result.status === 'needs_second_factor') {
                    setNeedsSecondFactor(true)
                    // Use email_code - TypeScript types are incorrect, but runtime works
                    await signIn.prepareSecondFactor({ strategy: 'email_code' } as any)
                    setLoading(false)
                }
            } catch (error: any) {
                setLoading(false)
                setIsSuccess(false)
                if (error.errors && error.errors[0].code === 'form_password_incorrect') {
                    toast.error('Email/password is incorrect. Please try again')
                } else {
                    toast.error('An error occurred. Please try again')
                }
            }
        }
    )

    const onVerifyOTP = async (otp: string) => {
        if (!isLoaded) return
        try {
            setLoading(true)
            console.log('Verifying OTP...', otp)
            const result = await signIn.attemptSecondFactor({
                strategy: 'email_code',
                code: otp
            } as any)
            console.log('OTP Verification Result:', result.status)

            if (result.status === 'complete') {
                await setActive({ session: result.createdSessionId })
                setIsSuccess(true)
                // Use router.push + refresh for smoother transition and to sync server state
                // This often handles the session token better than a hard reload immediately after set
                router.push('/dashboard')
                router.refresh()
            } else {
                setLoading(false)
                console.error('Verification failed, status:', result.status)
                toast.error('Verification failed')
            }
        } catch (error: any) {
            setLoading(false)
            console.error('OTP Verification Error:', error)
            if (error.errors && error.errors[0]) {
                toast.error(error.errors[0].longMessage)
            } else {
                toast.error('Invalid code')
            }
        }
    }

    return {
        methods,
        onHandleSubmit,
        loading,
        isSuccess,
        needsSecondFactor,
        onVerifyOTP
    }
}

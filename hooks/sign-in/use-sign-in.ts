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
                    toast.success('Welcome back!')
                    router.push('/dashboard')
                    router.refresh()
                } else if (result.status === 'needs_second_factor') {
                    setNeedsSecondFactor(true)
                    // Use phone_code strategy as required by Clerk types
                    await signIn.prepareSecondFactor({ strategy: 'phone_code' })
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
            const result = await signIn.attemptSecondFactor({
                strategy: 'phone_code',
                code: otp
            })

            if (result.status === 'complete') {
                await setActive({ session: result.createdSessionId })
                setIsSuccess(true)
                toast.success('Welcome back!')
                router.push('/dashboard')
                router.refresh()
            } else {
                setLoading(false)
                toast.error('Verification failed')
            }
        } catch (error: any) {
            setLoading(false)
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

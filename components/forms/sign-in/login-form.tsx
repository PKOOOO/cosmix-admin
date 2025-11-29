'use client'
import React, { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import FormGenerator from '../form-generator'
import { USER_LOGIN_FORM } from '@/constants/forms'
import { useSignInContext } from './form-provider'
import OTPInput from '@/components/otp'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

type Props = {}

const LoginForm = (props: Props) => {
    const {
        register,
        formState: { errors },
    } = useFormContext()

    const { needsSecondFactor, onVerifyOTP, loading } = useSignInContext()
    const [otp, setOtp] = useState('')

    if (needsSecondFactor) {
        return (
            <>
                <p className="text-iridium md:text-sm text-center">
                    Enter the code sent to your email.
                </p>
                <div className="w-full justify-center flex py-5">
                    <OTPInput
                        otp={otp}
                        setOtp={setOtp}
                    />
                </div>
                <div className="w-full flex flex-col gap-3 items-center px-4">
                    <Button
                        type="button"
                        className="w-full max-w-md"
                        disabled={loading}
                        onClick={() => onVerifyOTP(otp)}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Verifying...
                            </>
                        ) : (
                            'Verify Code'
                        )}
                    </Button>
                </div>
            </>
        )
    }

    return (
        <>
            <h2 className="text-gravel md:text-4xl font-bold text-center">Login</h2>
            <div className="w-full max-w-md mx-auto px-4 flex flex-col gap-3">
                {USER_LOGIN_FORM.map((field) => (
                    <FormGenerator
                        key={field.id}
                        {...field}
                        errors={errors}
                        register={register}
                        name={field.name}
                    />
                ))}
            </div>
        </>
    )
}

export default LoginForm

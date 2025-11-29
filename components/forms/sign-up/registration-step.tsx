'use client'

import { useAuthContextHook } from '@/context/use-auth-context'
import React, { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import AccountDetailsForm from './account-details-form'
import OTPForm from './otp-form'

type Props = {}

const RegistrationFormStep = (props: Props) => {
    const {
        register,
        formState: { errors },
        setValue,
    } = useFormContext()
    const { currentStep } = useAuthContextHook()
    const [onOTP, setOnOTP] = useState<string>('')

    setValue('otp', onOTP)

    switch (currentStep) {
        case 1:
            return (
                <AccountDetailsForm
                    errors={errors}
                    register={register}
                />
            )
        case 2:
            return (
                <OTPForm
                    onOTP={onOTP}
                    setOTP={setOnOTP}
                />
            )
    }

    return <div>RegistrationFormStep</div>
}

export default RegistrationFormStep

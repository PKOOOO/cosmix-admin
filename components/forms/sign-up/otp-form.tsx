import OTPInput from '@/components/otp'
import React from 'react'

type Props = {
    setOTP: React.Dispatch<React.SetStateAction<string>>
    onOTP: string
}

const OTPForm = ({ onOTP, setOTP }: Props) => {
    return (
        <>

            <p className="text-iridium md:text-sm text-center">
                Enter the OTP sent to your email.
            </p>
            <div className="w-full justify-center flex py-5">
                <OTPInput
                    otp={onOTP}
                    setOtp={setOTP}
                />
            </div>
        </>
    )
}

export default OTPForm

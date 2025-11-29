import React from 'react'
import { Input } from '@/components/ui/input'

type Props = {
    otp: string
    setOtp: React.Dispatch<React.SetStateAction<string>>
}

const OTPInput = ({ otp, setOtp }: Props) => {
    return (
        <div className="flex justify-center gap-2">
            <Input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="text-center text-2xl tracking-[1em] font-bold h-14 w-full max-w-[300px]"
                placeholder="000000"
            />
        </div>
    )
}

export default OTPInput

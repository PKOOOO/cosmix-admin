import { USER_REGISTRATION_FORM } from '@/constants/forms'
import React from 'react'
import { FieldErrors, FieldValues, UseFormRegister } from 'react-hook-form'
import FormGenerator from '../form-generator'

type Props = {
    register: UseFormRegister<FieldValues>
    errors: FieldErrors<FieldValues>
}

function AccountDetailsForm({ errors, register }: Props) {
    return (
        <>
            <h2 className="text-gravel md:text-4xl font-bold text-center">Account details</h2>
            <p className="text-iridium md:text-sm text-center">Enter your email and password</p>
            <div className="w-full max-w-md mx-auto px-4 flex flex-col gap-3">
                {USER_REGISTRATION_FORM.map((field) => (
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

export default AccountDetailsForm

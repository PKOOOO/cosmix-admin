import { CheckCircle2Icon } from "lucide-react";
import React from 'react';
import { Button } from "../ui/button";
import { StripeConnect } from "../settings/stripe-connect";


type IntegrationModalbodyProps = {
    type: string
    connections: {
        [key in 'stripe']: boolean
    }
}


export const IntegrationModalbody = ({
    type,
    connections,
}: IntegrationModalbodyProps) => {
    switch (type) {
        case 'stripe':
            return (
                <div className="flex flex-col gap-2">
                    <h2 className="font-bold">Stripe would like to access</h2>
                    {[
                        'Payment and Bank Information',
                        'Spa Services you Offer',
                        'Business and tax Information',
                        'Create and update services',
                    ].map((item, key) => (
                        <div
                            key={key}
                            className="flex gap-2 items-center pl-3"
                        >
                            <CheckCircle2Icon />
                            <p>{item}</p>
                        </div>
                    ))}
                    <div className="flex justify-between mt-10">
                        <Button variant="outline">Learn More</Button>
                        <StripeConnect connected={connections.stripe} />
                    </div>
                </div>
            )
            default:
                return <></>
    }
}
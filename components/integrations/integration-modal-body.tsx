import { CheckCircle2Icon } from "lucide-react";
import React from 'react';
import { Button } from "../ui/button";
import { PaytrailConnect } from "../settings/paytrail-connect";


type IntegrationModalbodyProps = {
    type: string
    connections: {
        [key in 'paytrail']: boolean
    }
}


export const IntegrationModalbody = ({
    type,
    connections,
}: IntegrationModalbodyProps) => {
    switch (type) {
        case 'paytrail':
            return (
                <div className="flex flex-col gap-2">
                    <h2 className="font-bold">Paytrail Payment Integration</h2>
                    {[
                        'Process payments from Finnish banks',
                        'Accept credit and debit cards',
                        'Mobile payment support (MobilePay, Siirto)',
                        'Secure payment processing',
                        'Real-time payment notifications',
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
                        <Button variant="outline" asChild>
                            <a href="https://www.paytrail.com/en/merchant-onboarding" target="_blank" rel="noopener noreferrer">
                                Learn More
                            </a>
                        </Button>
                        <PaytrailConnect connected={connections.paytrail} />
                    </div>
                </div>
            )
            default:
                return <></>
    }
}
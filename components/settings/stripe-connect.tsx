'use client'

import { useStripe } from "@/hooks/billing/use-billing"
import Loader from "../loader"
import { Button } from "../ui/button"


type StripeConnectProps = {
    connected: boolean
}

export const StripeConnect = ({ connected }: StripeConnectProps) => {
    const { 
        onStripeConnect, 
        onStripeAccountPending,
        onStripeDisconnect,
        onStripeDisconnectPending
    } = useStripe()

    if (connected) {
        return (
            <Button
                variant="destructive"
                onClick={onStripeDisconnect}
                disabled={onStripeDisconnectPending}
            >
                <Loader loading={onStripeDisconnectPending}>
                    Disconnect
                </Loader>
            </Button>
        )
    }

    return (
        <Button
            onClick={onStripeConnect}
            disabled={onStripeAccountPending}
        >
            <Loader loading={onStripeAccountPending}>
                Connect Stripe
            </Loader>
        </Button>
    )
}
import axios from "axios"
import { useState } from "react"
import { useRouter } from "next/navigation"

export const useStripe = () => {
    const [onStripeAccountPending, setOnStripeAccountPending] = useState<boolean>(false)
    const [onStripeDisconnectPending, setOnStripeDisconnectPending] = useState<boolean>(false)
    const router = useRouter()

    const onStripeConnect = async () => {
        try {
            setOnStripeAccountPending(true)
            console.log('[STRIPE] Starting Stripe Connect...')
            const account = await axios.get(`/api/stripe/connect`)
            console.log('[STRIPE] API response:', JSON.stringify(account.data))
            if (account) {
                setOnStripeAccountPending(false)
                if (account.data.url) {
                    console.log('[STRIPE] Redirecting to:', account.data.url)
                    window.location.href = account.data.url
                } else if (account.data.connected) {
                    console.log('[STRIPE] Already connected, refreshing')
                    router.refresh()
                }
            }
        } catch (error: any) {
            console.error('[STRIPE] Connect error:', error?.response?.status, error?.response?.data || error?.message || error)
            setOnStripeAccountPending(false)
        }
    }

    const onStripeDisconnect = async () => {
        try {
            setOnStripeDisconnectPending(true)
            const response = await axios.delete(`/api/stripe/connect`)
            if (response.data.disconnected) {
                setOnStripeDisconnectPending(false)
                // Refresh the page to update the UI
                router.refresh()
            }
        } catch (error) {
            console.log(error)
            setOnStripeDisconnectPending(false)
        }
    }

    return {
        onStripeConnect,
        onStripeAccountPending,
        onStripeDisconnect,
        onStripeDisconnectPending
    }
}
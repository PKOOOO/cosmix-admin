import axios from "axios"
import { useParams } from "next/navigation";
import { useState } from "react"



export const useStripe = () => {
    const [onStripeAccountPending, setOnStripeAccountPending] = 
    useState<boolean>(false)
    const params = useParams();

    const onStripeConnect = async () => {
        try { 
            setOnStripeAccountPending(true)
            const response = await axios.get(`/api/${params.storeId}/stripe/connect`)
            
            if (response.data?.url) {
                window.location.href = response.data.url
            } else {
                console.error('No URL returned from Stripe Connect API')
                // You might want to show a toast notification here
            }
        } catch (error) {
            console.error('Error connecting to Stripe:', error)
            // You might want to show a toast notification here
        } finally {
            setOnStripeAccountPending(false)
        }
    }

    return { onStripeConnect, onStripeAccountPending }
}
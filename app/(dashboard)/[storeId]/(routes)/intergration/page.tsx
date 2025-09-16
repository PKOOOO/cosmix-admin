import { getPaymentConnect } from "@/actions/get-payment-connect";
import IntegrationList from "@/components/integrations";

const IntergrationPage = async () => {
    const payment = await getPaymentConnect()

    const connections = {
        stripe: payment ? true : false,
    }

    return (
        <>
        <IntegrationList connections={connections} />
        </>
    )
}

export default IntergrationPage;
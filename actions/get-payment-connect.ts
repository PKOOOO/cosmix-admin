import { currentUser } from "@clerk/nextjs/server"
import prismadb from "@/lib/prismadb"

export const getPaymentConnect = async () => {
    try {
        const user = await currentUser()
        if (user) {
            const connected = await prismadb.user.findUnique({
                where: {
                    clerkId: user.id,
                },
                select: {
                    stripeId: true,
                },
            })
            if ( connected ) {
                return connected.stripeId
            }
        }
    } catch (error) {
        console.error(error)
    }
}
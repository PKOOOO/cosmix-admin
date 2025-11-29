'use server'

import prismadb from '@/lib/prismadb'
import { currentUser } from '@clerk/nextjs'

export const onCompleteUserRegistration = async (
    clerkId: string,
    email: string
) => {
    try {
        const registered = await prismadb.user.create({
            data: {
                name: email, // Use email as name since we don't collect fullname
                clerkId,
                email,
            },
            select: {
                name: true,
                id: true,
                email: true,
            },
        })

        if (registered) {
            return { status: 200, user: registered }
        }
    } catch (error) {
        console.error('Error creating user:', error)
        return { status: 400 }
    }
}

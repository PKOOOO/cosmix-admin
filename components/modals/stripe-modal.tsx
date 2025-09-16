import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import Image from 'next/image'
import { ArrowLeft, ArrowRight } from 'lucide-react'

type Props = {
    trigger: React.ReactNode
    children: React.ReactNode
    title: string
    description: string
    type?: 'integration'
    logo?: string    
}

const StripeModal = ({
    trigger,
    children,
    title,
    description,
    type,
    logo,
}: Props) => {
    switch (type) {
        case 'integration':
            return (
                <Dialog>
                    <DialogTrigger asChild>{trigger}</DialogTrigger>
                    <DialogContent>
                        <div className='flex justify-center gap-3'>
                            <div className='w-12 h-12 relative'>
                                <Image
                                    src={`https://res.cloudinary.com/dzmrvngco/image/upload/v1758023591/Icon_wvp1b1.jpg`}
                                    fill
                                    alt='Cosmix'
                                />
                            </div>
                            <div className='text-gray-400'>
                                <ArrowLeft size={20} />
                                <ArrowRight size={20} />
                            </div>
                            <div className='w-12 h-12 relative'>
                                <Image
                                    src={logo || `https://res.cloudinary.com/dzmrvngco/image/upload/v1758023591/Icon_wvp1b1.jpg`}
                                    fill
                                    alt='Integration'
                                />
                            </div>
                        </div>
                        <DialogHeader className='flex items-center'>
                            <DialogTitle className='text-xl'>{title}</DialogTitle>
                            <DialogDescription className='text-center'>
                                {description}
                            </DialogDescription>
                        </DialogHeader>
                        {children}
                    </DialogContent>
                </Dialog>
            )
        default:
            return (
                <Dialog>
                    <DialogTrigger asChild>{trigger}</DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className='text-xl'>{title}</DialogTitle>
                            <DialogDescription>{description}</DialogDescription>
                        </DialogHeader>
                        {children}
                    </DialogContent>
                </Dialog>
            )
    }
}

export default StripeModal
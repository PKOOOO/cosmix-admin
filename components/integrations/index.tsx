'use client'
import react from 'react'
import { Card, CardContent, CardDescription } from '../ui/card';
import Image from 'next/image';
import { INTERGRATION_LIST_ITEMS } from '@/constants/integrations';
import IntegrationTrigger from './IntegrationTrigger';

type Props = {
    connections: {
        paytrail: boolean;
    }
}

const IntegrationList = (props: Props) => {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">
                Paytrail-integraatio tulossa pian</h1>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 max-w-4xl'>
                {INTERGRATION_LIST_ITEMS.map((item) => (
                    <Card key={item.id} className="w-full">
                        <CardContent className='flex flex-col p-6 gap-4'>
                            <div className='flex w-full justify-between items-start gap-4'>
                                <div className="flex-1">
                                    <div className='w-12 h-12 relative mb-3'>
                                        <Image
                                            src={item.logo}
                                            alt="Logo"
                                            fill
                                            className="object-contain rounded-md"
                                        />
                                    </div>
                                    <h2 className='font-bold capitalize text-lg'>{item.name}</h2>
                                </div>
                                <IntegrationTrigger
                                    connections={props.connections}
                                    title={item.title}
                                    description={item.modalDescription}
                                    logo={item.logo}
                                    name={item.name}
                                />
                            </div>
                            <CardDescription className="text-sm">{item.description}</CardDescription>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}

export default IntegrationList;
import React from 'react'
import { Modal } from '../ui/modal'
import { Card } from '../ui/card'
import { CloudIcon } from 'lucide-react'
import { Separator } from '../ui/separator'
import StripeModal from '../modals/stripe-modal'
import { IntegrationModalbody } from './integration-modal-body'

interface Props {
    name: 'stripe'
    logo: string
    title: string
    description: string
    connections: {
        [key in 'stripe']: boolean
    }
    
}

const IntegrationTrigger = ({ 
    name, 
    logo, 
    title, 
    description, 
    connections,
 }: Props) => {
    return (
        <StripeModal
        title={title}
        type="integration"
        logo={logo}
        description={description}
        trigger={
            <Card className="px-3 py-2 cursor-pointer flex gap-2">
                <CloudIcon />
                {connections[name] ? 'Connected' : 'Connect'}

            </Card>
        }
        >
            <Separator orientation="horizontal" />
            <IntegrationModalbody
                connections={connections}
                type={name}
            />

        </StripeModal>
    )
}

export default IntegrationTrigger

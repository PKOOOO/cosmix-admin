import React from 'react'
import { Modal } from '../ui/modal'
import { Card } from '../ui/card'
import { CloudIcon } from 'lucide-react'
import { Separator } from '../ui/separator'
import PaytrailModal from '../modals/paytrail-modal'
import { IntegrationModalbody } from './integration-modal-body'

interface Props {
    name: 'paytrail'
    logo: string
    title: string
    description: string
    connections: {
        [key in 'paytrail']: boolean
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
        <PaytrailModal
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
        isOpen={false}
        onClose={() => {}}
        >
            <Separator orientation="horizontal" />
            <IntegrationModalbody
                connections={connections}
                type={name}
            />

        </PaytrailModal>
    )
}

export default IntegrationTrigger

type IntegrationsListProps = {
    id: string
    name: 'stripe'
    logo: string
    description: string
    title: string
    modalDescription: string
}

export const INTERGRATION_LIST_ITEMS: IntegrationsListProps[] = [
    {
        id: '1',
        name: 'stripe',
        description: 'Stripe is a payment processing platform that allows you to accept payments online.',
        title: 'Connect Stripe Account',
        modalDescription: 'The world most successful payment processing platform, use stripe to accept payments from your customers.',
        logo: 'https://res.cloudinary.com/dzmrvngco/image/upload/v1758023591/Icon_wvp1b1.jpg',
    },
]
type IntegrationsListProps = {
    id: string
    name: 'paytrail'
    logo: string
    description: string
    title: string
    modalDescription: string
}

export const INTERGRATION_LIST_ITEMS: IntegrationsListProps[] = [
    {
        id: '1',
        name: 'paytrail',
        description: 'Paytrail is Finland\'s leading payment service provider, offering comprehensive payment solutions for Finnish businesses.',
        title: 'Configure Paytrail Account',
        modalDescription: 'Paytrail provides secure payment processing with support for all Finnish banks, cards, and mobile payment methods. Perfect for businesses operating in Finland.',
        logo: 'https://www.paytrail.com/wp-content/themes/paytrail/assets/images/paytrail-logo.svg',
    },
]
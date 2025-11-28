type IntegrationsListProps = {
    id: string
    name: 'paytrail'
    logo: string
    description: string
    title: string
}

export const INTERGRATION_LIST_ITEMS: IntegrationsListProps[] = [
    {
        id: '1',
        name: 'paytrail',
        description: 'Paytrail on Suomen johtava maksupalveluntarjoaja, joka tarjoaa kattavia maksuratkaisuja suomalaisille yrityksille..',
        title: 'Configure Paytrail Account',
        logo: '/logo.png',
    },
]
// app/dashboard/integration/components/integration-client.tsx
"use client";
import IntegrationList from "@/components/integrations";

interface IntegrationClientProps {
    connections: {
        stripe: boolean;
    };
}

export const IntegrationClient = ({ connections }: IntegrationClientProps) => {
    return <IntegrationList connections={connections} />;
};

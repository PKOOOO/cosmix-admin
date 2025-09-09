"use client";

import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSaloonModal } from "@/hooks/use-saloon-modal";

export default function ChangeSaloonButton() {
    const { storeId } = useParams<{ storeId: string }>() as { storeId?: string };
    const modal = useSaloonModal();

    if (!storeId) return null;

    return (
        <Button variant="outline" size="sm" onClick={modal.onOpen}>
            Change Saloon
        </Button>
    );
}



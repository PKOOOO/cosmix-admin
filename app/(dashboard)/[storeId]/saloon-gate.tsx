"use client";

import { useEffect } from "react";
import { useSaloonModal } from "@/hooks/use-saloon-modal";
import axios from "axios";
import { usePathname, useRouter } from "next/navigation";

export default function SaloonGate({ storeId, children }: { storeId: string; children: React.ReactNode }) {
    const modal = useSaloonModal();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!storeId) return;
        const key = `selectedSaloonId_${storeId}`;
        const cookie = document.cookie.split("; ").find((c) => c.startsWith(`${key}=`));
        const value = cookie?.split("=")[1];
        // Don't prompt while user is on saloons routes (they may be creating one)
        if (pathname?.includes(`/saloons`)) return;

        if (value || modal.isOpen) return;

        // If no cookie, try to auto-select when exactly one owned saloon exists
        (async () => {
            try {
                const res = await axios.get(`/api/${storeId}/saloons?owned=1`);
                const saloons = res.data as Array<{ id: string }>;
                if (Array.isArray(saloons) && saloons.length === 1) {
                    const only = saloons[0];
                    document.cookie = `${key}=${only.id}; path=/; max-age=${60 * 60 * 24 * 30}`;
                    router.refresh();
                    return;
                }
            } catch {}
            // Fallback: prompt selection/creation
            modal.onOpen();
        })();
    }, [storeId, modal, pathname]);

    return <>{children}</>;
}



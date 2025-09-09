"use client";

import { create } from "zustand";

type SaloonModalStore = {
    isOpen: boolean;
    onOpen: () => void;
    onClose: () => void;
};

export const useSaloonModal = create<SaloonModalStore>((set) => ({
    isOpen: false,
    onOpen: () => set({ isOpen: true }),
    onClose: () => set({ isOpen: false }),
}));



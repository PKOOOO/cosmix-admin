"use client";

import { Dialog,
         DialogContent,
         DialogDescription, 
         DialogHeader, 
         DialogTitle 
} from "@/components/ui/dialog";

interface ModalProps {
    title: string;
    description: string;
    isOpen: boolean;
    onClose: () => void;
    children?: React.ReactNode;
    className?: string; // optional extra classes for sizing
}

export const Modal: React.FC<ModalProps> = ({
    title,
    description,
    isOpen,
    onClose,
    children,
    className
}) => {
    const onChange = (open: boolean) => {
        if (!open) {
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onChange} modal={true}>
            <DialogContent className={
                [
                    "sm:max-w-2xl w-[95vw]", // make content a nice rectangle
                    "max-h-[85vh] overflow-y-auto z-[1001]", // keep above most overlays
                    className || ""
                ].join(" ")
            } onInteractOutside={(e) => {
                try {
                    // If Cloudinary widget is open, don't close this dialog
                    if (typeof window !== 'undefined' && (window as any).__cloudinaryOpen) {
                        e.preventDefault();
                    }
                } catch {}
            }} onEscapeKeyDown={(e) => {
                try {
                    if (typeof window !== 'undefined' && (window as any).__cloudinaryOpen) {
                        e.preventDefault();
                    }
                } catch {}
            }}>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <div>
                    {children}
                </div>
            </DialogContent>
        </Dialog>
    );
};
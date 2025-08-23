// app/post-sign-in/post-sign-in-client.tsx

"use client";

import { useEffect, useState } from "react";
import { useStoreModal } from "@/hooks/use-store-modal";
import { StoreModal } from "@/components/modals/store-modal";

export const PostSignInClient = () => {
  const storeModal = useStoreModal();
  const [hasOpened, setHasOpened] = useState(false);

  useEffect(() => {
    // Only open the modal once when component first mounts
    if (!hasOpened && !storeModal.isOpen) {
      storeModal.onOpen();
      setHasOpened(true);
    }
  }, [storeModal, hasOpened]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-4">Welcome!</h1>
        <p className="text-muted-foreground">Let's create your first store to get started.</p>
      </div>
      <StoreModal />
    </div>
  );
};
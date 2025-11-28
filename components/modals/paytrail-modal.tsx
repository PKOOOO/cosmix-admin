"use client";

import { useState } from "react";
import { Modal } from "../ui/modal";
import Image from "next/image";

interface PaytrailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  type: string;
  logo: string;
  description: string;
  trigger: React.ReactNode;
  children: React.ReactNode;
}

export default function PaytrailModal({
  isOpen: initialIsOpen,
  onClose: initialOnClose,
  title,
  type,
  logo,
  description,
  trigger,
  children,
}: PaytrailModalProps) {
  const [isOpen, setIsOpen] = useState(initialIsOpen);

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => {
    setIsOpen(false);
    initialOnClose();
  };

  return (
    <>
      <div onClick={handleOpen}>
        {trigger}
      </div>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={title}
        description={description}
      >
        {children}
      </Modal>
    </>
  );
}

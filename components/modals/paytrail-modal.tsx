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
  isOpen,
  onClose,
  title,
  type,
  logo,
  description,
  trigger,
  children,
}: PaytrailModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
    >
      {children}
    </Modal>
  );
}

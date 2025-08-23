import { Roboto } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";

import { ModalProvider } from "@/providers/modal-provider";

import "./globals.css";

import type { Metadata } from "next";
import { ToastProvider } from "@/providers/toast-provider";
import NextTopLoader from 'nextjs-toploader';
import { Header } from "@/components/Header";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "700"], // Add font weights as needed
});


export const metadata: Metadata = {
  title: "Digihipo Admin",
  description: "Digihipo Admin",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
    <html lang="en">
      <body className={roboto.className}>
     
      <NextTopLoader
              color="#3b82f6" // Default blue - change to match your theme
              height={3}
              showSpinner={true}
              
            />
        <ToastProvider />
        <ModalProvider />
        {children}
        </body>
    </html>
    </ClerkProvider>
  );
}

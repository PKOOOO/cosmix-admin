import { Philosopher } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";

import { ModalProvider } from "@/providers/modal-provider";
import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

import type { Metadata } from "next";
import { ToastProvider } from "@/providers/toast-provider";
import NextTopLoader from 'nextjs-toploader';
import { Header } from "@/components/Header";

const philosopher = Philosopher({
  subsets: ["latin"],
  weight: ["400", "700"],
});


export const metadata: Metadata = {
  title: "Digihipo Admin",
  description: "Digihipo Admin",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={philosopher.className}>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            <NextTopLoader
              color="#423120" // Brand dark color
              height={3}
              showSpinner={true}
            />
            <ToastProvider />
            <ModalProvider />
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

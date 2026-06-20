import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";

import { Header } from "@/components/header";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Terapeutica Spine SL — Imágenes",
  description: "Archivo interno de imágenes de Terapeutica Spine SL",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="es" suppressHydrationWarning>
        <body className={`${inter.variable} font-sans antialiased`}>
          <Header />
          <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}

import type { Metadata } from "next";
import { Outfit } from "next/font/google";

import { SoftAuroraBackground } from "@/components/SoftAuroraBackground";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit"
});

export const metadata: Metadata = {
  title: "Movie Suggestion",
  description: "A modern movie recommendation app built with Next.js",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${outfit.variable} bg-canvas font-sans text-white antialiased`}>
        <SoftAuroraBackground />
        {children}
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@repo/ui";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "WIN Wholesale Hub - B2B & Dropship Reseller Platform",
  description: "Next-generation enterprise wholesale platform and automated dropshipping fulfillment infrastructure.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/win-icon.png", type: "image/png" },
    ],
    shortcut: "/win-icon.png",
    apple: "/win-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`}>
      <body className="min-h-screen">
        {children}
        <Toaster />
      </body>
    </html>
  );
}

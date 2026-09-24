import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Commercial E-Commerce Storefront",
  description: "Multi-tenant student reseller store",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}

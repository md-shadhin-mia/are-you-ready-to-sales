import React from "react";
import { notFound } from "next/navigation";
import { ThemeProvider } from "../../../components/ThemeProvider";
import { Navbar } from "../../../components/Navbar";
import { CheckoutFormClient } from "./CheckoutFormClient";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function getStoreMeta(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/api/v1/stores/${slug}/meta`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function CheckoutPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;
  const store = await getStoreMeta(slug);

  if (!store) {
    notFound();
  }

  return (
    <ThemeProvider themeConfig={store.themeConfig}>
      <Navbar
        storeSlug={slug}
        storeName={store.storeName}
        logoUrl={store.logoUrl}
        tagline={store.brandingInfo?.tagline}
      />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            Secure Checkout
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete your order with Cash on Delivery or Mobile Financial Services (bKash/Nagad).
          </p>
        </div>

        <CheckoutFormClient storeSlug={slug} />
      </main>
    </ThemeProvider>
  );
}

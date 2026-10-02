import React from "react";
import { notFound } from "next/navigation";
import { ThemeProvider } from "../../../components/ThemeProvider";
import { Navbar } from "../../../components/Navbar";
import { TrackOrderClient } from "./TrackOrderClient";

import { API_BASE } from "../../../lib/api-base";
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

export default async function TrackOrderPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { order?: string };
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

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-foreground">
            Track Your Package
          </h1>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Enter your order number (e.g. <code>ORD-20260924-XXXX</code>) to see real-time fulfillment and courier dispatch updates.
          </p>
        </div>

        <TrackOrderClient
          storeSlug={slug}
          initialOrderNumber={searchParams?.order || ""}
        />
      </main>
    </ThemeProvider>
  );
}

import React from "react";
import { notFound } from "next/navigation";
import { ThemeProvider } from "../../components/ThemeProvider";
import { Navbar } from "../../components/Navbar";
import { CartDrawer } from "../../components/CartDrawer";
import { ProductCard } from "../../components/ProductCard";
import { Store, ShoppingBag, Sparkles, ShieldCheck, Truck } from "lucide-react";
import { Card, EmptyState } from "@repo/ui";

import { API_BASE } from "../../lib/api-base";
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

async function getStoreProducts(slug: string, search?: string) {
  try {
    const url = new URL(`${API_BASE}/api/v1/stores/${slug}/products`);
    if (search) url.searchParams.set("search", search);
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return { data: [], meta: { total: 0 } };
    return await res.json();
  } catch {
    return { data: [], meta: { total: 0 } };
  }
}

export default async function StorefrontPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { search?: string };
}) {
  const { slug } = params;
  const store = await getStoreMeta(slug);

  if (!store) {
    notFound();
  }

  const productsData = await getStoreProducts(slug, searchParams?.search);
  const products = productsData.data || [];

  return (
    <ThemeProvider themeConfig={store.themeConfig}>
      <Navbar
        storeSlug={slug}
        storeName={store.storeName}
        logoUrl={store.logoUrl}
        tagline={store.brandingInfo?.tagline}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-10 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Hero Section */}
        <section className="relative flex flex-col items-center justify-between gap-6 overflow-hidden rounded-2xl bg-slate-950 p-6 text-white shadow-xl sm:gap-8 sm:rounded-3xl sm:p-10 md:flex-row md:p-12">
          <div className="pointer-events-none absolute -left-20 -top-24 h-80 w-80 rounded-full bg-primary/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 right-10 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative z-10 max-w-xl space-y-4 text-center md:text-left">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-300" />
              <span className="truncate">Curated by {store.storeName}</span>
            </div>
            <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl md:text-5xl">
              Premium quality, <br />
              <span className="text-primary brightness-125">delivered to your door.</span>
            </h1>
            <p className="text-sm leading-relaxed text-slate-300 sm:text-base">
              {store.brandingInfo?.tagline ||
                "Browse our verified catalog of genuine products with Cash on Delivery and doorstep fulfillment across Bangladesh."}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-1 text-xs text-slate-300 md:justify-start">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" /> Verified seller
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-emerald-400" /> Cash on delivery
              </span>
            </div>
          </div>

          <div className="relative z-10 flex h-32 w-32 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-md sm:h-44 sm:w-44 sm:p-6 md:h-56 md:w-56">
            {store.logoUrl ? (
              <img src={store.logoUrl} alt={store.storeName} className="max-h-full max-w-full object-contain" />
            ) : (
              <div className="space-y-2 text-center">
                <Store className="mx-auto h-10 w-10 text-primary brightness-125 sm:h-16 sm:w-16" />
                <p className="max-w-[120px] truncate text-xs font-bold tracking-wide sm:max-w-none sm:text-sm">
                  {store.storeName}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Catalog Section */}
        <section className="space-y-6">
          <div className="flex flex-col justify-between gap-2 border-b pb-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-2xl font-extrabold">
                {searchParams?.search ? `Results for “${searchParams.search}”` : "Featured Products"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Showing {products.length} {products.length === 1 ? "product" : "products"}
              </p>
            </div>
          </div>

          {products.length === 0 ? (
            <Card>
              <EmptyState
                icon={ShoppingBag}
                title={searchParams?.search ? "No matching products" : "No products available yet"}
                description={
                  searchParams?.search
                    ? "Try a different search term or browse the full catalog."
                    : "This store is currently curating items. Please check back soon."
                }
                className="py-20"
              />
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
              {products.map((product: any) => (
                <ProductCard key={product.id} storeSlug={slug} product={product} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Cart Drawer */}
      <CartDrawer storeSlug={slug} />

      {/* Footer */}
      <footer className="mt-auto space-y-2 border-t bg-card py-8 text-center text-xs text-muted-foreground">
        <p className="font-heading font-semibold text-foreground">{store.storeName}</p>
        <p>
          Powered by Bangladesh Reseller Commerce Platform • All rights reserved
        </p>
      </footer>
    </ThemeProvider>
  );
}

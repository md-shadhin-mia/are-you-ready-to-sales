import React from "react";
import { notFound } from "next/navigation";
import { ThemeProvider } from "../../components/ThemeProvider";
import { Navbar } from "../../components/Navbar";
import { CartDrawer } from "../../components/CartDrawer";
import { ProductCard } from "../../components/ProductCard";
import { Store, ShoppingBag, Sparkles, ShieldCheck } from "lucide-react";

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
      {/* Announcement Bar */}
      <div className="bg-slate-900 text-white text-xs py-2 px-4 text-center font-medium">
        🎉 Welcome to {store.storeName}! Free express shipping on orders over ৳1,500.
      </div>

      <Navbar
        storeSlug={slug}
        storeName={store.storeName}
        logoUrl={store.logoUrl}
        tagline={store.brandingInfo?.tagline}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-10">
        {/* Hero Section */}
        <section className="relative rounded-3xl p-8 sm:p-12 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl text-center md:text-left z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
              Curated by {store.storeName}
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Premium Quality <br />
              <span className="text-blue-400">Directly to Your Doorstep.</span>
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              {store.brandingInfo?.tagline ||
                "Browse our verified catalog of genuine products with Cash on Delivery and doorstep fulfillment across Bangladesh."}
            </p>
          </div>

          <div className="h-44 w-44 sm:h-56 sm:w-56 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center p-6 flex-shrink-0 shadow-2xl">
            {store.logoUrl ? (
              <img
                src={store.logoUrl}
                alt={store.storeName}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <div className="text-center space-y-2">
                <Store className="h-16 w-16 mx-auto text-blue-400 opacity-80" />
                <p className="font-bold text-sm tracking-wide">{store.storeName}</p>
              </div>
            )}
          </div>
        </section>

        {/* Catalog Section */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-2xl font-extrabold text-slate-900">
                Featured Products
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Showing {products.length} {products.length === 1 ? "product" : "products"}
              </p>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="py-20 text-center space-y-3 bg-white rounded-2xl border border-slate-200">
              <ShoppingBag className="h-12 w-12 mx-auto text-slate-300" />
              <h4 className="text-base font-semibold text-slate-700">No products available yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                This store is currently curating items. Please check back soon or explore other collections.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
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
      <footer className="mt-auto border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500 space-y-2">
        <p className="font-semibold text-slate-700">{store.storeName}</p>
        <p>
          Powered by Bangladesh Reseller Commerce Platform • All rights reserved
        </p>
      </footer>
    </ThemeProvider>
  );
}

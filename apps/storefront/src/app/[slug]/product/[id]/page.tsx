import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ThemeProvider } from "../../../../components/ThemeProvider";
import { Navbar } from "../../../../components/Navbar";
import { CartDrawer } from "../../../../components/CartDrawer";
import { ProductDetailClient } from "./ProductDetailClient";
import { ChevronRight, ShieldCheck, Truck, RotateCcw } from "lucide-react";

import { API_BASE } from "../../../../lib/api-base";
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

async function getProductDetail(slug: string, productId: string) {
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/stores/${slug}/products/${productId}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: { slug: string; id: string };
}) {
  const { slug, id } = params;
  const [store, product] = await Promise.all([
    getStoreMeta(slug),
    getProductDetail(slug, id),
  ]);

  if (!store || !product) {
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

      <main className="flex-1 max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-6 w-full space-y-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 sm:gap-2 text-xs text-muted-foreground overflow-hidden">
          <Link href={`/${slug}`} className="hover:text-foreground transition-colors shrink-0">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="capitalize truncate max-w-[110px] sm:max-w-none shrink-0">{product.category?.name || "Products"}</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="text-foreground font-medium truncate max-w-[130px] sm:max-w-xs">
            {product.title}
          </span>
        </nav>

        {/* Client Product View */}
        <ProductDetailClient storeSlug={slug} product={product} />

        {/* Value Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-6 sm:pt-8 border-t border-border">
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-2xl border border-slate-100">
            <Truck className="h-6 w-6 text-primary flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-foreground">Doorstep Delivery</h4>
              <p className="text-[11px] text-muted-foreground">৳80 Dhaka Metropolitan • ৳150 All Districts</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-2xl border border-slate-100">
            <ShieldCheck className="h-6 w-6 text-emerald-600 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-foreground">100% Genuine Quality</h4>
              <p className="text-[11px] text-muted-foreground">Directly sourced wholesale inventory</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-2xl border border-slate-100">
            <RotateCcw className="h-6 w-6 text-primary flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-foreground">Easy Returns</h4>
              <p className="text-[11px] text-muted-foreground">Hassle-free 7-day replacement guarantee</p>
            </div>
          </div>
        </div>
      </main>

      <CartDrawer storeSlug={slug} />
    </ThemeProvider>
  );
}

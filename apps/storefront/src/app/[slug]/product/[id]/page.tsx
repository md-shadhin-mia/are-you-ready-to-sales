import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ThemeProvider } from "../../../../components/ThemeProvider";
import { Navbar } from "../../../../components/Navbar";
import { CartDrawer } from "../../../../components/CartDrawer";
import { ProductDetailClient } from "./ProductDetailClient";
import { ChevronRight, ShieldCheck, Truck, RotateCcw } from "lucide-react";

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

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-500">
          <Link href={`/${slug}`} className="hover:text-slate-900 transition-colors">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="capitalize">{product.category?.name || "Products"}</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-900 font-medium truncate max-w-xs">
            {product.title}
          </span>
        </nav>

        {/* Client Product View */}
        <ProductDetailClient storeSlug={slug} product={product} />

        {/* Value Badges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8 border-t border-slate-200">
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <Truck className="h-6 w-6 text-store-primary flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-slate-900">Doorstep Delivery</h4>
              <p className="text-[11px] text-slate-500">৳80 Dhaka Metropolitan • ৳150 All Districts</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <ShieldCheck className="h-6 w-6 text-emerald-600 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-slate-900">100% Genuine Quality</h4>
              <p className="text-[11px] text-slate-500">Directly sourced wholesale inventory</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <RotateCcw className="h-6 w-6 text-blue-600 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-slate-900">Easy Returns</h4>
              <p className="text-[11px] text-slate-500">Hassle-free 7-day replacement guarantee</p>
            </div>
          </div>
        </div>
      </main>

      <CartDrawer storeSlug={slug} />
    </ThemeProvider>
  );
}

import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ThemeProvider } from "../../../../components/ThemeProvider";
import { Navbar } from "../../../../components/Navbar";
import {
  CheckCircle2,
  Package,
  Truck,
  ArrowRight,
  ShoppingBag,
} from "lucide-react";

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

async function getOrderDetails(orderNumber: string) {
  try {
    const res = await fetch(`${API_BASE}/api/v1/orders/track/${orderNumber}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function OrderConfirmationPage({
  params,
}: {
  params: { slug: string; orderNumber: string };
}) {
  const { slug, orderNumber } = params;
  const [store, order] = await Promise.all([
    getStoreMeta(slug),
    getOrderDetails(orderNumber),
  ]);

  if (!store || !order) {
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

      <main className="flex-1 max-w-3xl mx-auto px-3.5 sm:px-6 lg:px-8 py-8 sm:py-12 w-full space-y-6 sm:space-y-8">
        {/* Success Card */}
        <div className="bg-card p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-border shadow-sm text-center space-y-4">
          <div className="h-14 w-14 sm:h-16 sm:w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10" />
          </div>

          <div>
            <h1 className="text-xl sm:text-3xl font-extrabold text-foreground">
              Order Confirmed!
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Thank you for shopping with <strong>{store.storeName}</strong>. Your order has been placed and inventory is reserved.
            </p>
          </div>

          <div className="p-3 sm:p-4 bg-muted/50 rounded-xl sm:rounded-2xl border border-border/80 inline-block font-mono text-xs sm:text-sm font-black text-foreground break-all max-w-full">
            {order.orderNumber}
          </div>
        </div>

        {/* Order Details Receipt */}
        <div className="bg-card p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border border-border shadow-sm space-y-6">
          <h2 className="font-extrabold text-base text-foreground border-b border-slate-100 pb-3 flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Order Summary & Receipt
          </h2>

          {/* Items */}
          <div className="divide-y divide-border/60">
            {order.items?.map((item: any) => (
              <div key={item.id} className="py-3 flex items-center justify-between text-xs sm:text-sm">
                <div>
                  <p className="font-bold text-foreground">{item.title}</p>
                  <p className="text-muted-foreground text-xs">Quantity: {item.quantity}</p>
                </div>
                <div className="font-extrabold text-foreground">
                  ৳{item.totalPrice?.toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {/* Splits */}
          <div className="border-t border-border pt-4 space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-semibold text-foreground">
                ৳{order.subtotal?.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Shipping Fee</span>
              <span className="font-semibold text-foreground">
                ৳{order.shippingFee?.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Payment Method</span>
              <span className="font-bold text-foreground">{order.paymentMethod}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Payment Status</span>
              <span className="font-bold text-emerald-700">{order.paymentStatus}</span>
            </div>
            <div className="border-t border-border pt-3 flex justify-between text-base font-extrabold text-foreground">
              <span>Total Amount</span>
              <span>৳{order.totalAmount?.toLocaleString()}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Link
              href={`/${slug}/track?order=${order.orderNumber}`}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 text-center flex items-center justify-center gap-2 shadow-sm"
            >
              <Truck className="h-4 w-4" />
              Track Package Status
            </Link>
            <Link
              href={`/${slug}`}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-xs border border-input text-slate-700 hover:bg-muted/50 text-center flex items-center justify-center gap-2"
            >
              <ShoppingBag className="h-4 w-4" />
              Continue Shopping
            </Link>
          </div>
        </div>
      </main>
    </ThemeProvider>
  );
}

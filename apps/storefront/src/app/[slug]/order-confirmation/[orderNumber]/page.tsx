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

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full space-y-8">
        {/* Success Card */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-4">
          <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Order Confirmed!
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Thank you for shopping with <strong>{store.storeName}</strong>. Your order has been placed and inventory is reserved.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 inline-block font-mono text-sm font-black text-slate-900">
            {order.orderNumber}
          </div>
        </div>

        {/* Order Details Receipt */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="font-extrabold text-base text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Package className="h-5 w-5 text-store-primary" />
            Order Summary & Receipt
          </h2>

          {/* Items */}
          <div className="divide-y divide-slate-100">
            {order.items?.map((item: any) => (
              <div key={item.id} className="py-3 flex items-center justify-between text-xs sm:text-sm">
                <div>
                  <p className="font-bold text-slate-900">{item.title}</p>
                  <p className="text-slate-500 text-xs">Quantity: {item.quantity}</p>
                </div>
                <div className="font-extrabold text-slate-900">
                  ৳{item.totalPrice?.toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {/* Splits */}
          <div className="border-t border-slate-200 pt-4 space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-900">
                ৳{order.subtotal?.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Shipping Fee</span>
              <span className="font-semibold text-slate-900">
                ৳{order.shippingFee?.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Payment Method</span>
              <span className="font-bold text-slate-900">{order.paymentMethod}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Payment Status</span>
              <span className="font-bold text-emerald-700">{order.paymentStatus}</span>
            </div>
            <div className="border-t border-slate-200 pt-3 flex justify-between text-base font-extrabold text-slate-900">
              <span>Total Amount</span>
              <span>৳{order.totalAmount?.toLocaleString()}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Link
              href={`/${slug}/track?order=${order.orderNumber}`}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-xs btn-store-primary text-center flex items-center justify-center gap-2 shadow-sm"
            >
              <Truck className="h-4 w-4" />
              Track Package Status
            </Link>
            <Link
              href={`/${slug}`}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-xs border border-slate-300 text-slate-700 hover:bg-slate-50 text-center flex items-center justify-center gap-2"
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

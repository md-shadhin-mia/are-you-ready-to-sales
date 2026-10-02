"use client";

import React from "react";
import { WholesaleCartItem } from "./types";

interface WholesaleCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: WholesaleCartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onProceedCheckout: () => void;
}

export function WholesaleCartDrawer({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onProceedCheckout,
}: WholesaleCartDrawerProps) {
  if (!isOpen) return null;

  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const totalMSRP = items.reduce(
    (sum, item) => sum + item.product.msrp * item.quantity,
    0
  );
  const estimatedProfit = Math.max(0, totalMSRP - subtotal);
  const freeShippingThreshold = 5000;
  const shippingFee = subtotal >= freeShippingThreshold || subtotal === 0 ? 0 : 120;
  const totalAmount = subtotal + shippingFee;
  const progressToFreeShipping = Math.min(
    100,
    Math.round((subtotal / freeShippingThreshold) * 100)
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200">
          {/* Header */}
          <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-brand flex items-center justify-center border border-blue-200/60">
                <span className="material-symbols-outlined text-[20px]">receipt_long</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-tight">Wholesale Purchase Order</h2>
                <p className="text-xs text-slate-500">
                  {items.length} {items.length === 1 ? "Product Line" : "Product Lines"} &bull; Factory Direct
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Free Shipping Progress Indicator */}
          {subtotal > 0 && (
            <div className="px-5 py-3 bg-blue-50/50 border-b border-blue-100">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-700 flex items-center gap-1">
                  <span className="material-symbols-outlined text-brand text-[15px]">local_shipping</span>
                  {subtotal >= freeShippingThreshold ? (
                    <span className="text-emerald-700 font-bold">Free Bulk Delivery Unlocked!</span>
                  ) : (
                    <span>Add ৳{(freeShippingThreshold - subtotal).toLocaleString()} more for Free Delivery</span>
                  )}
                </span>
                <span className="font-bold text-brand">{progressToFreeShipping}%</span>
              </div>
              <div className="w-full h-1.5 bg-blue-200/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand transition-all duration-300 rounded-full"
                  style={{ width: `${progressToFreeShipping}%` }}
                />
              </div>
            </div>
          )}

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 divide-y divide-slate-100 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                  <span className="material-symbols-outlined text-[32px]">inventory_2</span>
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Purchase Order is Empty</h3>
                <p className="text-xs text-slate-500 max-w-xs mt-1">
                  Browse verified factory catalog products and add items meeting minimum order quantities (MOQ).
                </p>
              </div>
            ) : (
              items.map((item) => {
                const lineTotal = item.product.price * item.quantity;
                return (
                  <div key={item.product.id} className="pt-4 first:pt-0 flex gap-3.5">
                    <img
                      src={item.product.image}
                      alt={item.product.title}
                      className="w-18 h-18 rounded-xl object-cover border border-slate-200 bg-slate-50 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {item.product.sku}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 line-clamp-1 mt-1">
                            {item.product.title}
                          </h4>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Unit: <span className="font-semibold text-brand">৳{item.product.price}</span>
                            <span className="line-through text-slate-400 ml-1.5">৳{item.product.msrp}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => onRemoveItem(item.product.id)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>

                      {/* Stepper & Line Total */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                        <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                          <button
                            onClick={() => onUpdateQuantity(item.product.id, -1)}
                            disabled={item.quantity <= item.product.moq}
                            className="w-6 h-6 rounded bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs disabled:opacity-30 disabled:hover:bg-white transition-colors"
                          >
                            -
                          </button>
                          <span className="text-xs font-bold text-slate-800 min-w-7 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.product.id, 1)}
                            className="w-6 h-6 rounded bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs transition-colors"
                          >
                            +
                          </button>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-slate-900">
                            ৳{lineTotal.toLocaleString()}
                          </div>
                          <span className="text-[10px] text-emerald-600 font-semibold">
                            MOQ: {item.product.moq}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer & Checkout Trigger */}
          {items.length > 0 && (
            <div className="p-5 border-t border-slate-200 bg-slate-50 space-y-3">
              {/* Reseller Profit Callout */}
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-700 text-[18px]">trending_up</span>
                  <span className="text-xs font-bold text-emerald-900">Estimated Reseller Profit</span>
                </div>
                <span className="text-sm font-extrabold text-emerald-700">
                  +৳{estimatedProfit.toLocaleString()}
                </span>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Wholesale Subtotal</span>
                  <span className="font-semibold text-slate-900">৳{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bulk Freight Delivery</span>
                  <span className="font-semibold text-slate-900">
                    {shippingFee === 0 ? (
                      <span className="text-emerald-700 font-bold">FREE</span>
                    ) : (
                      `৳${shippingFee}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total Order Value</span>
                  <span className="text-brand">৳{totalAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={onProceedCheckout}
                className="w-full py-3 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-sm shadow-md shadow-brand/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <span className="material-symbols-outlined text-[18px]">shopping_cart_checkout</span>
                <span>Proceed to Wholesale Checkout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

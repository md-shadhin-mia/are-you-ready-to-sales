"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "../store/useCart";
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight } from "lucide-react";

interface CartDrawerProps {
  storeSlug: string;
}

export function CartDrawer({ storeSlug }: CartDrawerProps) {
  const {
    items,
    isOpen,
    closeCart,
    updateQuantity,
    removeItem,
    getSubtotal,
    getTotalItems,
    setStoreSlug,
  } = useCart();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    setStoreSlug(storeSlug);
  }, [storeSlug, setStoreSlug]);

  if (!mounted || !isOpen) return null;

  const subtotal = getSubtotal();
  const totalItems = getTotalItems();

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={closeCart}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-store-primary" />
              <h2 className="text-lg font-bold text-slate-900">Your Cart</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-600">
                {totalItems}
              </span>
            </div>
            <button
              onClick={closeCart}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <ShoppingBag className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-800">Your cart is empty</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Looks like you haven't added any products yet.
                  </p>
                </div>
                <button
                  onClick={closeCart}
                  className="px-4 py-2 text-xs font-semibold btn-store-primary rounded-xl"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.storeProductId}
                  className="flex gap-4 p-3 rounded-xl border border-slate-100 bg-slate-50/50"
                >
                  {/* Thumbnail */}
                  <div className="h-16 w-16 rounded-lg bg-white border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ShoppingBag className="h-6 w-6 text-slate-300" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 truncate">
                        {item.title}
                      </h4>
                      <p className="text-xs font-bold text-slate-900 mt-0.5">
                        ৳{item.sellingPrice.toLocaleString()}
                      </p>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
                        <button
                          onClick={() => updateQuantity(item.storeProductId, item.quantity - 1)}
                          className="p-1 hover:bg-slate-100 text-slate-600 transition-colors"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-2.5 text-xs font-semibold text-slate-800">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.storeProductId, item.quantity + 1)}
                          disabled={item.quantity >= item.stockQuantity}
                          className="p-1 hover:bg-slate-100 text-slate-600 disabled:opacity-40 transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.storeProductId)}
                        className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Checkout */}
          {items.length > 0 && (
            <div className="p-5 border-t border-slate-200 bg-slate-50 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-medium">Subtotal</span>
                <span className="text-lg font-bold text-slate-900">
                  ৳{subtotal.toLocaleString()}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Shipping and delivery calculated at checkout (৳80 Dhaka / ৳150 Outside).
              </p>
              <Link
                href={`/${storeSlug}/checkout`}
                onClick={closeCart}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm btn-store-primary shadow-sm hover:opacity-95 transition-opacity"
              >
                Proceed to Checkout
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Store, ShoppingBag, ShieldCheck, Search, Truck } from "lucide-react";
import { useCart } from "../store/useCart";

import { AnnouncementBar } from "./marketing/AnnouncementBar";

interface NavbarProps {
  storeSlug: string;
  storeName: string;
  logoUrl?: string | null;
  tagline?: string | null;
}

export function Navbar({ storeSlug, storeName, logoUrl, tagline }: NavbarProps) {
  const { openCart, getTotalItems } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalItems = mounted ? getTotalItems() : 0;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <AnnouncementBar storeSlug={storeSlug} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <Link href={`/${storeSlug}`} className="flex items-center gap-3 min-w-0">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={storeName}
              className="h-10 w-10 rounded-xl object-contain border border-slate-200"
            />
          ) : (
            <div className="h-10 w-10 rounded-xl btn-store-primary flex items-center justify-center font-bold text-white shadow-sm flex-shrink-0">
              {storeName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="truncate">
            <h1 className="font-extrabold text-base sm:text-lg text-slate-900 leading-tight truncate">
              {storeName}
            </h1>
            {tagline && (
              <p className="text-[11px] text-slate-500 truncate hidden sm:block">
                {tagline}
              </p>
            )}
          </div>
        </Link>

        {/* Center / Verified Badge */}
        <div className="hidden md:flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Verified Student Reseller
          </span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Order Tracking Link */}
          <Link
            href={`/${storeSlug}/track`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Truck className="h-4 w-4" />
            <span className="hidden sm:inline">Track Order</span>
          </Link>

          {/* Cart Button */}
          <button
            onClick={openCart}
            className="relative flex items-center gap-2 px-3 py-2 rounded-xl btn-store-primary shadow-sm hover:opacity-95 transition-opacity"
            aria-label="View shopping cart"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline text-xs font-bold">Cart</span>
            {totalItems > 0 && (
              <span className="inline-flex items-center justify-center bg-white text-slate-900 text-[10px] font-black h-4 w-4 rounded-full">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

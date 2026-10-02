"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag, ShieldCheck, Search, Truck } from "lucide-react";
import { Badge, Button, Input } from "@repo/ui";
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

  const searchForm = (className: string) => (
    <form action={`/${storeSlug}`} method="get" role="search" className={className}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input name="search" type="search" placeholder="Search products…" aria-label="Search products" className="h-9 bg-muted/60 pl-9 shadow-none" />
    </form>
  );

  return (
    <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur-md supports-[backdrop-filter]:bg-card/75">
      <AnnouncementBar storeSlug={storeSlug} />
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <Link href={`/${storeSlug}`} className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={storeName}
              className="h-9 w-9 shrink-0 rounded-lg border object-contain sm:h-10 sm:w-10"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary font-heading font-bold text-primary-foreground shadow-sm sm:h-10 sm:w-10">
              {storeName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-heading text-sm font-extrabold leading-tight text-foreground sm:text-lg">
              {storeName}
            </p>
            {tagline && <p className="hidden truncate text-[11px] text-muted-foreground sm:block">{tagline}</p>}
          </div>
        </Link>

        {searchForm("relative hidden w-full max-w-sm md:block")}

        {/* Right Actions */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Badge variant="success" className="hidden lg:inline-flex">
            <ShieldCheck />
            Verified Reseller
          </Badge>

          <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
            <Link href={`/${storeSlug}/track`}>
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">Track Order</span>
            </Link>
          </Button>

          <Button onClick={openCart} size="sm" className="relative h-9" aria-label="View shopping cart">
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Cart</span>
            {totalItems > 0 && (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-card px-1 text-[10px] font-bold text-foreground">
                {totalItems}
              </span>
            )}
          </Button>
        </div>
      </div>
      <div className="px-4 pb-3 md:hidden">{searchForm("relative")}</div>
    </header>
  );
}

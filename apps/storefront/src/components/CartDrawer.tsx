"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "../store/useCart";
import { ShoppingBag, Plus, Minus, Trash2, ArrowRight } from "lucide-react";
import {
  Badge,
  Button,
  EmptyState,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@repo/ui";

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

  if (!mounted) return null;

  const subtotal = getSubtotal();
  const totalItems = getTotalItems();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeCart()}>
      <SheetContent side="right" className="gap-0 p-0">
        <SheetHeader className="border-b p-5">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Your Cart
            <Badge variant="secondary">{totalItems}</Badge>
          </SheetTitle>
          <SheetDescription className="sr-only">Review items in your cart before checkout</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {items.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="Your cart is empty"
              description="Looks like you haven't added any products yet."
              action={
                <Button size="sm" onClick={closeCart}>
                  Continue Shopping
                </Button>
              }
              className="h-full"
            />
          ) : (
            items.map((item) => (
              <div key={item.storeProductId} className="flex gap-4 rounded-lg border bg-muted/30 p-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-card">
                  {item.image ? (
                    <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                  ) : (
                    <ShoppingBag className="h-6 w-6 text-muted-foreground/50" />
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div>
                    <h4 className="truncate text-sm font-semibold text-foreground">{item.title}</h4>
                    <p className="mt-0.5 text-sm font-bold text-foreground">৳{item.sellingPrice.toLocaleString()}</p>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center overflow-hidden rounded-md border bg-card shadow-xs">
                      <button
                        onClick={() => updateQuantity(item.storeProductId, item.quantity - 1)}
                        className="p-1.5 text-muted-foreground transition-colors hover:bg-muted"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="px-2.5 text-xs font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.storeProductId, item.quantity + 1)}
                        disabled={item.quantity >= item.stockQuantity}
                        className="p-1.5 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.storeProductId)}
                      className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="space-y-4 border-t bg-muted/40 p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-muted-foreground">Subtotal</span>
              <span className="font-heading text-lg font-bold">৳{subtotal.toLocaleString()}</span>
            </div>
            <Separator />
            <p className="text-[11px] text-muted-foreground">
              Shipping and delivery calculated at checkout (৳80 Dhaka / ৳150 Outside).
            </p>
            <Button asChild size="lg" className="w-full">
              <Link href={`/${storeSlug}/checkout`} onClick={closeCart}>
                Proceed to Checkout
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

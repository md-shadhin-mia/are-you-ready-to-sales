"use client";

import React from "react";
import Link from "next/link";
import { ShoppingBag, Star } from "lucide-react";
import { Badge, Button, Card } from "@repo/ui";
import { useCart } from "../store/useCart";

interface ProductCardProps {
  storeSlug: string;
  product: {
    id: string;
    title: string;
    sellingPrice: number;
    compareAtPrice?: number | null;
    images: string[];
    inStock: boolean;
    stockQuantity: number;
    category?: { name: string };
    ratingAvg?: number;
    totalReviewsCount?: number;
  };
}

export function ProductCard({ storeSlug, product }: ProductCardProps) {
  const { addItem } = useCart();
  const primaryImage = product.images?.[0];
  const onSale = !!product.compareAtPrice && product.compareAtPrice > product.sellingPrice;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!product.inStock) return;

    addItem({
      storeProductId: product.id,
      title: product.title,
      sellingPrice: product.sellingPrice,
      compareAtPrice: product.compareAtPrice,
      image: primaryImage,
      stockQuantity: product.stockQuantity,
    });
  };

  return (
    <Card className="group relative flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <Link href={`/${storeSlug}/product/${product.id}`} className="relative block aspect-square overflow-hidden bg-muted">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={product.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
            <ShoppingBag className="h-12 w-12" />
          </div>
        )}

        <div className="absolute inset-x-2 top-2 flex justify-between gap-2 sm:inset-x-3 sm:top-3">
          {!product.inStock ? (
            <Badge className="border-transparent bg-destructive text-destructive-foreground">Out of Stock</Badge>
          ) : (
            <span />
          )}
          {onSale && (
            <Badge variant="accent">
              {Math.round(((product.compareAtPrice! - product.sellingPrice) / product.compareAtPrice!) * 100)}% OFF
            </Badge>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col justify-between p-3 sm:p-4">
        <div>
          {product.category && (
            <span className="block truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {product.category.name}
            </span>
          )}
          <Link href={`/${storeSlug}/product/${product.id}`}>
            <h3 className="mt-0.5 line-clamp-2 font-sans text-xs font-semibold leading-snug tracking-normal text-foreground transition-colors group-hover:text-primary sm:text-sm">
              {product.title}
            </h3>
          </Link>
          {!!product.totalReviewsCount && (
            <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Star className="h-3 w-3 fill-accent text-accent" />
              <span className="font-semibold text-foreground">{(product.ratingAvg ?? 0).toFixed(1)}</span>
              <span>({product.totalReviewsCount})</span>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-1.5 border-t pt-2.5 sm:mt-4 sm:pt-3">
          <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-baseline sm:gap-1.5">
            <span className="truncate font-heading text-sm font-extrabold text-foreground sm:text-base">
              ৳{product.sellingPrice.toLocaleString()}
            </span>
            {onSale && (
              <span className="truncate text-[10px] text-muted-foreground line-through sm:text-xs">
                ৳{product.compareAtPrice!.toLocaleString()}
              </span>
            )}
          </div>

          <Button
            size="icon"
            onClick={handleAddToCart}
            disabled={!product.inStock}
            className="h-9 w-9 shrink-0"
            title={product.inStock ? "Add to cart" : "Out of stock"}
          >
            <ShoppingBag className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { ShoppingBag, Star, Check } from "lucide-react";
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
    <div className="group relative bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
      {/* Product Image */}
      <Link
        href={`/${storeSlug}/product/${product.id}`}
        className="aspect-square bg-slate-50 relative overflow-hidden block"
      >
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <ShoppingBag className="h-12 w-12" />
          </div>
        )}

        {/* Stock Badge */}
        {!product.inStock && (
          <div className="absolute top-3 left-3 bg-red-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            Out of Stock
          </div>
        )}

        {product.compareAtPrice && product.compareAtPrice > product.sellingPrice && (
          <div className="absolute top-3 right-3 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {Math.round(((product.compareAtPrice - product.sellingPrice) / product.compareAtPrice) * 100)}% OFF
          </div>
        )}
      </Link>

      {/* Details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {product.category && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {product.category.name}
            </span>
          )}
          <Link href={`/${storeSlug}/product/${product.id}`}>
            <h3 className="font-semibold text-sm text-slate-900 group-hover:text-store-primary transition-colors line-clamp-2 mt-0.5">
              {product.title}
            </h3>
          </Link>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-extrabold text-slate-900">
                ৳{product.sellingPrice.toLocaleString()}
              </span>
              {product.compareAtPrice && product.compareAtPrice > product.sellingPrice && (
                <span className="text-xs text-slate-400 line-through">
                  ৳{product.compareAtPrice.toLocaleString()}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={!product.inStock}
            className="p-2 rounded-xl btn-store-primary shadow-sm hover:opacity-95 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            title={product.inStock ? "Add to cart" : "Out of stock"}
          >
            <ShoppingBag className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

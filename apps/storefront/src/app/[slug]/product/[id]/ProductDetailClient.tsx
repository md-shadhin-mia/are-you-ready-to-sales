"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, Plus, Minus, Zap, CheckCircle2, AlertCircle } from "lucide-react";
import { useCart } from "../../../../store/useCart";

interface ProductDetailClientProps {
  storeSlug: string;
  product: {
    id: string;
    title: string;
    description?: string;
    sellingPrice: number;
    compareAtPrice?: number | null;
    images: string[];
    inStock: boolean;
    stockQuantity: number;
    category?: { name: string };
  };
}

export function ProductDetailClient({ storeSlug, product }: ProductDetailClientProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const [selectedImage, setSelectedImage] = useState(product.images?.[0] || "");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const handleAddToCart = () => {
    if (!product.inStock) return;
    addItem(
      {
        storeProductId: product.id,
        title: product.title,
        sellingPrice: product.sellingPrice,
        compareAtPrice: product.compareAtPrice,
        image: selectedImage || product.images?.[0],
        stockQuantity: product.stockQuantity,
      },
      quantity,
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    if (!product.inStock) return;
    addItem(
      {
        storeProductId: product.id,
        title: product.title,
        sellingPrice: product.sellingPrice,
        compareAtPrice: product.compareAtPrice,
        image: selectedImage || product.images?.[0],
        stockQuantity: product.stockQuantity,
      },
      quantity,
    );
    router.push(`/${storeSlug}/checkout`);
  };

  const discountPercent =
    product.compareAtPrice && product.compareAtPrice > product.sellingPrice
      ? Math.round(((product.compareAtPrice - product.sellingPrice) / product.compareAtPrice) * 100)
      : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
      {/* Left: Gallery */}
      <div className="space-y-4">
        {/* Main Display Image */}
        <div className="aspect-square bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden flex items-center justify-center p-4">
          {selectedImage ? (
            <img
              src={selectedImage}
              alt={product.title}
              className="max-h-full max-w-full object-contain rounded-2xl"
            />
          ) : (
            <ShoppingBag className="h-20 w-20 text-slate-300" />
          )}
        </div>

        {/* Thumbnails */}
        {product.images && product.images.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {product.images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImage(img)}
                className={`h-20 w-20 flex-shrink-0 rounded-2xl border-2 p-1 overflow-hidden transition-all ${
                  selectedImage === img
                    ? "border-store-primary shadow-sm"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <img
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  className="h-full w-full object-cover rounded-xl"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: Info & Purchase */}
      <div className="space-y-6 flex flex-col justify-center">
        <div>
          {product.category && (
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {product.category.name}
            </span>
          )}
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mt-1 leading-tight">
            {product.title}
          </h1>
        </div>

        {/* Price & Discounts */}
        <div className="flex items-center gap-3">
          <span className="text-3xl font-black text-slate-900">
            ৳{product.sellingPrice.toLocaleString()}
          </span>
          {product.compareAtPrice && product.compareAtPrice > product.sellingPrice && (
            <>
              <span className="text-base text-slate-400 line-through">
                ৳{product.compareAtPrice.toLocaleString()}
              </span>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-extrabold px-2.5 py-1 rounded-full">
                {discountPercent}% OFF
              </span>
            </>
          )}
        </div>

        {/* Stock Status Badge */}
        <div>
          {product.inStock ? (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              In Stock ({product.stockQuantity} units available)
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
              <AlertCircle className="h-3.5 w-3.5 text-red-600" />
              Currently Out of Stock
            </div>
          )}
        </div>

        {/* Quantity Controls & Purchase Buttons */}
        {product.inStock && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-slate-700">Quantity</span>
              <div className="flex items-center border border-slate-300 rounded-xl bg-white overflow-hidden shadow-sm">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-2 hover:bg-slate-100 text-slate-600 transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="px-4 text-sm font-bold text-slate-900">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(product.stockQuantity, q + 1))}
                  disabled={quantity >= product.stockQuantity}
                  className="p-2 hover:bg-slate-100 text-slate-600 disabled:opacity-40 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleAddToCart}
                className="flex-1 py-3.5 px-6 rounded-2xl font-bold text-sm border-2 border-slate-300 hover:border-slate-400 bg-white text-slate-900 flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                {added ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Added to Cart!
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4" />
                    Add to Cart
                  </>
                )}
              </button>

              <button
                onClick={handleBuyNow}
                className="flex-1 py-3.5 px-6 rounded-2xl font-bold text-sm btn-store-primary flex items-center justify-center gap-2 shadow-sm hover:opacity-95 transition-opacity"
              >
                <Zap className="h-4 w-4 fill-current" />
                Buy Now
              </button>
            </div>
          </div>
        )}

        {/* Product Description */}
        <div className="pt-6 border-t border-slate-200 space-y-2">
          <h3 className="font-bold text-sm text-slate-900">About this Product</h3>
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
            {product.description || "High quality guaranteed product ready for instant delivery."}
          </p>
        </div>
      </div>
    </div>
  );
}

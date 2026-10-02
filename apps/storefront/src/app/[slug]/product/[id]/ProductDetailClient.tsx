"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  Plus,
  Minus,
  Zap,
  CheckCircle2,
  AlertCircle,
  Star,
  ShieldCheck,
  Truck,
  Store,
  Package,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import { useCart } from "../../../../store/useCart";
import { apiClient, Review, ReviewDimensionBreakdown } from "@repo/api-client";

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

  // Reviews state
  const [reviewsData, setReviewsData] = useState<{
    breakdown: ReviewDimensionBreakdown;
    reviews: Review[];
    meta: any;
  } | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  useEffect(() => {
    apiClient.reviews
      .getByProduct(storeSlug, product.id)
      .then((data) => setReviewsData(data))
      .catch((err) => console.error("Failed to load reviews:", err))
      .finally(() => setReviewsLoading(false));
  }, [storeSlug, product.id]);

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
        <div className="aspect-square bg-muted/50 rounded-2xl sm:rounded-3xl border border-border overflow-hidden flex items-center justify-center p-3 sm:p-4">
          {selectedImage ? (
            <img
              src={selectedImage}
              alt={product.title}
              className="max-h-full max-w-full object-contain rounded-xl sm:rounded-2xl"
            />
          ) : (
            <ShoppingBag className="h-16 w-16 sm:h-20 sm:w-20 text-slate-300" />
          )}
        </div>

        {/* Thumbnails */}
        {product.images && product.images.length > 1 && (
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2">
            {product.images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImage(img)}
                className={`h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 rounded-xl sm:rounded-2xl border-2 p-1 overflow-hidden transition-all ${
                  selectedImage === img
                    ? "border-primary shadow-sm"
                    : "border-border hover:border-input"
                }`}
              >
                <img
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  className="h-full w-full object-cover rounded-lg sm:rounded-xl"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: Info & Purchase */}
      <div className="space-y-5 sm:space-y-6 flex flex-col justify-center">
        <div>
          {product.category && (
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {product.category.name}
            </span>
          )}
          <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-foreground mt-1 leading-tight">
            {product.title}
          </h1>
        </div>

        {/* Price & Discounts */}
        <div className="flex items-center gap-3">
          <span className="text-3xl font-black text-foreground">
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
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-destructive bg-destructive/5 border border-destructive/20 px-3 py-1 rounded-full">
              <AlertCircle className="h-3.5 w-3.5 text-destructive" />
              Currently Out of Stock
            </div>
          )}
        </div>

        {/* Quantity Controls & Purchase Buttons */}
        {product.inStock && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-slate-700">Quantity</span>
              <div className="flex items-center border border-input rounded-xl bg-card overflow-hidden shadow-sm">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-2 hover:bg-muted text-slate-600 transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="px-4 text-sm font-bold text-foreground">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(product.stockQuantity, q + 1))}
                  disabled={quantity >= product.stockQuantity}
                  className="p-2 hover:bg-muted text-slate-600 disabled:opacity-40 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleAddToCart}
                className="flex-1 py-3.5 px-6 rounded-2xl font-bold text-sm border-2 border-input hover:border-slate-400 bg-card text-foreground flex items-center justify-center gap-2 shadow-sm transition-all"
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
                className="flex-1 py-3.5 px-6 rounded-2xl font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2 shadow-sm hover:opacity-95 transition-opacity"
              >
                <Zap className="h-4 w-4 fill-current" />
                Buy Now
              </button>
            </div>
          </div>
        )}

        {/* Product Description */}
        <div className="pt-6 border-t border-border space-y-2">
          <h3 className="font-bold text-sm text-foreground">About this Product</h3>
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
            {product.description || "High quality guaranteed product ready for instant delivery."}
          </p>
        </div>
      </div>

      {/* Tri-Dimensional Reviews Section */}
      <div className="lg:col-span-2 pt-12 border-t border-border/80 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2.5">
              <MessageSquare className="h-6 w-6 text-primary" />
              Verified Customer Reviews
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Independent ratings for product quality, student seller service, and delivery speed.
            </p>
          </div>

          <button
            onClick={() => router.push(`/${storeSlug}/review`)}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-semibold text-xs transition-colors shadow-xs"
          >
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            Write a Review
          </button>
        </div>

        {reviewsLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Loading reviews and rating breakdown...
          </div>
        ) : !reviewsData || reviewsData.breakdown.totalReviews === 0 ? (
          <div className="bg-muted/50 border border-border rounded-3xl p-8 text-center space-y-3">
            <div className="h-12 w-12 bg-card rounded-2xl border border-border shadow-xs flex items-center justify-center mx-auto text-slate-400">
              <Star className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-sm text-foreground">No Reviews Yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Be the first to review this product after your order is delivered!
            </p>
            <button
              onClick={() => router.push(`/${storeSlug}/review`)}
              className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 pt-1"
            >
              Submit an order review
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 3D Breakdown Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Product Quality Card */}
              <div className="bg-card border border-border rounded-2xl p-4 shadow-xs flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/5 text-primary">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase">Product Quality</p>
                  <p className="text-lg font-bold text-foreground flex items-center gap-1.5">
                    {reviewsData.breakdown.averageProductRating} ★
                    <span className="text-xs font-normal text-slate-400">/ 5.0</span>
                  </p>
                </div>
              </div>

              {/* Store Service Card */}
              <div className="bg-card border border-border rounded-2xl p-4 shadow-xs flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase">Seller Service</p>
                  <p className="text-lg font-bold text-foreground flex items-center gap-1.5">
                    {reviewsData.breakdown.averageStoreRating} ★
                    <span className="text-xs font-normal text-slate-400">/ 5.0</span>
                  </p>
                </div>
              </div>

              {/* Delivery Speed Card */}
              <div className="bg-card border border-border rounded-2xl p-4 shadow-xs flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase">Delivery & Packing</p>
                  <p className="text-lg font-bold text-foreground flex items-center gap-1.5">
                    {reviewsData.breakdown.averageDeliveryRating} ★
                    <span className="text-xs font-normal text-slate-400">/ 5.0</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Star Distribution Meter */}
            <div className="bg-muted/50 border border-border/80 rounded-2xl p-5 max-w-md">
              <p className="text-xs font-bold text-foreground mb-3">Rating Breakdown</p>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count =
                    (reviewsData.breakdown.starDistribution as any)?.[stars] || 0;
                  const pct =
                    reviewsData.breakdown.totalReviews > 0
                      ? Math.round((count / reviewsData.breakdown.totalReviews) * 100)
                      : 0;
                  return (
                    <div key={stars} className="flex items-center gap-3 text-xs">
                      <span className="w-10 font-medium text-slate-600 flex items-center gap-1">
                        {stars} <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      </span>
                      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-slate-400 text-[11px]">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Individual Reviews Cards */}
            <div className="space-y-4 pt-2">
              {reviewsData.reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                        {rev.customer?.fullName?.[0] || "C"}
                      </div>
                      <div className="min-w-0 truncate">
                        <p className="text-xs font-bold text-foreground truncate">
                          {rev.customer?.fullName}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {new Date(rev.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        Verified Purchase
                      </span>
                    </div>
                  </div>

                  {/* 3D Score Pills */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="inline-flex items-center gap-1 bg-muted text-slate-700 text-[11px] font-semibold px-2.5 py-0.5 rounded-md">
                      Product: {rev.productRating} ★
                    </span>
                    <span className="inline-flex items-center gap-1 bg-muted text-slate-700 text-[11px] font-semibold px-2.5 py-0.5 rounded-md">
                      Service: {rev.storeRating} ★
                    </span>
                    <span className="inline-flex items-center gap-1 bg-muted text-slate-700 text-[11px] font-semibold px-2.5 py-0.5 rounded-md">
                      Delivery: {rev.deliveryRating} ★
                    </span>
                  </div>

                  {/* Comments */}
                  <div className="space-y-1.5 pt-1 text-xs text-slate-700">
                    {rev.productComment && (
                      <p>
                        <span className="font-semibold text-foreground">Product: </span>
                        {rev.productComment}
                      </p>
                    )}
                    {rev.storeComment && (
                      <p>
                        <span className="font-semibold text-foreground">Service: </span>
                        {rev.storeComment}
                      </p>
                    )}
                    {rev.deliveryComment && (
                      <p>
                        <span className="font-semibold text-foreground">Delivery: </span>
                        {rev.deliveryComment}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

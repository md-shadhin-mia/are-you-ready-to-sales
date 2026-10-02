"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Star,
  CheckCircle2,
  AlertCircle,
  Truck,
  Store,
  Package,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { apiClient } from "@repo/api-client";

import { Input, Label, Textarea } from "@repo/ui";
interface ReviewFormClientProps {
  storeSlug: string;
}

export function ReviewFormClient({ storeSlug }: ReviewFormClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("token") || "";

  // Lookup state
  const [token, setToken] = useState(tokenParam);
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [verificationError, setVerificationError] = useState("");

  // Review form state
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productRating, setProductRating] = useState(5);
  const [storeRating, setStoreRating] = useState(5);
  const [deliveryRating, setDeliveryRating] = useState(5);
  const [productComment, setProductComment] = useState("");
  const [storeComment, setStoreComment] = useState("");
  const [deliveryComment, setDeliveryComment] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Auto-verify if token is present in URL
  useEffect(() => {
    if (tokenParam) {
      handleVerifyToken(tokenParam);
    }
  }, [tokenParam]);

  const handleVerifyToken = async (tok: string) => {
    setVerifying(true);
    setVerificationError("");
    try {
      const res = await apiClient.reviews.verifyToken(storeSlug, tok);
      setVerificationResult(res);
      // Auto-select first non-reviewed item
      const eligible = res.items.find((i: any) => !i.alreadyReviewed);
      if (eligible) {
        setSelectedProductId(eligible.masterProductId);
      }
    } catch (err: any) {
      setVerificationError(
        err.message || "Invalid or expired review invitation token.",
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleManualLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber || !phone) return;
    setVerifying(true);
    setVerificationError("");
    try {
      const res = await apiClient.reviews.verifyOrder(
        storeSlug,
        orderNumber.trim(),
        phone.trim(),
      );
      setVerificationResult(res);
      const eligible = res.items.find((i: any) => !i.alreadyReviewed);
      if (eligible) {
        setSelectedProductId(eligible.masterProductId);
      }
    } catch (err: any) {
      setVerificationError(
        err.message ||
          "No delivered order found matching this order number and phone number.",
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setSubmitError("Please select a product to review.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      await apiClient.reviews.submit(storeSlug, {
        reviewToken: token || undefined,
        orderNumber: !token ? orderNumber : undefined,
        customerPhone: !token ? phone : undefined,
        masterProductId: selectedProductId,
        productRating,
        storeRating,
        deliveryRating,
        productComment,
        storeComment,
        deliveryComment,
      });
      setSubmittedSuccess(true);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStarSelector = (
    label: string,
    icon: React.ReactNode,
    value: number,
    onChange: (val: number) => void,
    description: string,
  ) => {
    return (
      <div className="bg-muted/50 border border-border/80 rounded-2xl p-3.5 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-card border border-border shadow-xs text-primary shrink-0">
              {icon}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-xs sm:text-sm text-foreground">{label}</p>
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-snug">{description}</p>
            </div>
          </div>
          <span className="text-xs sm:text-sm font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60 shrink-0 self-start sm:self-auto">
            {value} / 5 Stars
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 pt-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              type="button"
              key={star}
              onClick={() => onChange(star)}
              className="p-1 text-slate-300 hover:text-amber-400 focus:outline-none transition-colors"
            >
              <Star
                className={`h-6 w-6 sm:h-7 sm:w-7 transition-all ${
                  star <= value
                    ? "fill-amber-400 text-amber-400 scale-105"
                    : "text-slate-300 hover:text-amber-200"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    );
  };

  if (submittedSuccess) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <div className="h-20 w-20 bg-green-100 text-green-600 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-sm">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Thank You for Your Feedback!
        </h2>
        <p className="text-sm text-slate-600 mb-6">
          Your verified review has been published. It helps fellow shoppers and
          directly rewards the student entrepreneur running this store.
        </p>

        <div className="inline-flex items-center gap-2 bg-primary/5 text-primary px-4 py-2 rounded-xl text-xs font-semibold mb-8 border border-primary/60">
          <ShieldCheck className="h-4 w-4" />
          Marked as Verified Purchase
        </div>

        <div>
          <button
            onClick={() => router.push(`/${storeSlug}`)}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-2xl font-semibold text-sm shadow-sm hover:opacity-95 transition-all"
          >
            Continue Shopping
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      {/* Header */}
      <div className="mb-8 text-center space-y-2">
        <div className="inline-flex items-center gap-2 bg-primary/5 text-primary px-3 py-1 rounded-full text-xs font-semibold border border-primary/60">
          <Sparkles className="h-3.5 w-3.5" />
          Customer Feedback Loop
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Share Your Store Experience
        </h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          We separate product quality, seller service, and delivery speed so
          your review is fair and accurate.
        </p>
      </div>

      {/* Verification Step: Lookup by token or Order # + Phone */}
      {!verificationResult ? (
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-xs">
          <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Verify Your Purchase
          </h2>

          {verificationError && (
            <div className="mb-6 p-4 rounded-2xl bg-destructive/5 border border-destructive/20 text-destructive text-xs flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {verificationError}
            </div>
          )}

          <form onSubmit={handleManualLookup} className="space-y-4">
            <div>
              <Label className="block text-xs font-semibold text-slate-700 mb-1">
                Order Number
              </Label>
              <Input
                type="text"
                placeholder="e.g. ORD-20260924-1234"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                required
                className="w-full text-sm"
              />
            </div>

            <div>
              <Label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number
              </Label>
              <Input
                type="text"
                placeholder="e.g. 01700000000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={verifying}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm shadow-sm hover:opacity-95 transition-all disabled:opacity-50"
            >
              {verifying ? "Checking Eligibility..." : "Find Delivered Order"}
            </button>
          </form>
        </div>
      ) : (
        /* Review Submission Form */
        <form
          onSubmit={handleSubmitReview}
          className="bg-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-xs space-y-5 sm:space-y-6"
        >
          {/* Order & Customer Badge */}
          <div className="p-3 sm:p-4 rounded-2xl bg-primary/60 border border-primary/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="min-w-0">
              <p className="font-semibold text-foreground break-all">
                Order #{verificationResult.orderNumber}
              </p>
              <p className="text-muted-foreground truncate">
                Shopper: {verificationResult.customerName}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-green-700 font-semibold bg-green-50 px-2.5 py-1 rounded-full border border-green-200 shrink-0 self-start sm:self-auto">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              Verified Order
            </span>
          </div>

          {submitError && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-destructive/5 border border-destructive/20 text-destructive text-xs flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {submitError}
            </div>
          )}

          {/* Item Selector */}
          <div>
            <Label className="block text-xs font-semibold text-slate-700 mb-2">
              Select Item to Review
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {verificationResult.items.map((item: any) => (
                <button
                  type="button"
                  key={item.masterProductId}
                  disabled={item.alreadyReviewed}
                  onClick={() => setSelectedProductId(item.masterProductId)}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                    item.alreadyReviewed
                      ? "opacity-40 bg-muted border-border cursor-not-allowed"
                      : selectedProductId === item.masterProductId
                        ? "border-primary bg-primary/50 shadow-xs ring-2 ring-primary/10"
                        : "border-border hover:border-input bg-card"
                  }`}
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="h-12 w-12 rounded-xl object-contain bg-muted/50 border border-slate-100"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center text-slate-400">
                      <Package className="h-5 w-5" />
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <p className="font-semibold text-xs text-foreground truncate">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {item.alreadyReviewed ? "Already Reviewed" : "Tap to rate"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Dimension 1: Product Quality */}
          {renderStarSelector(
            "Product Quality",
            <Package className="h-5 w-5" />,
            productRating,
            setProductRating,
            "Build material, accuracy to photos, and overall value",
          )}
          <div>
            <Label className="block text-xs font-medium text-slate-600 mb-1">
              Comments on Product Quality (Optional)
            </Label>
            <Textarea
              rows={2}
              placeholder="How did the product perform? Is the size and build as expected?"
              value={productComment}
              onChange={(e) => setProductComment(e.target.value)}
              className="w-full text-xs"
            />
          </div>

          {/* Dimension 2: Store Service */}
          {renderStarSelector(
            "Seller Service & Communication",
            <Store className="h-5 w-5" />,
            storeRating,
            setStoreRating,
            "Seller responsiveness, customer care, and order confirmation",
          )}
          <div>
            <Label className="block text-xs font-medium text-slate-600 mb-1">
              Comments on Seller Service (Optional)
            </Label>
            <Textarea
              rows={2}
              placeholder="Was the merchant polite, helpful, and communicative?"
              value={storeComment}
              onChange={(e) => setStoreComment(e.target.value)}
              className="w-full text-xs"
            />
          </div>

          {/* Dimension 3: Delivery Speed & Packaging */}
          {renderStarSelector(
            "Delivery & Packaging",
            <Truck className="h-5 w-5" />,
            deliveryRating,
            setDeliveryRating,
            "Fulfillment speed, courier handling, and package protection",
          )}
          <div>
            <Label className="block text-xs font-medium text-slate-600 mb-1">
              Comments on Delivery (Optional)
            </Label>
            <Textarea
              rows={2}
              placeholder="Did the parcel arrive on time and intact?"
              value={deliveryComment}
              onChange={(e) => setDeliveryComment(e.target.value)}
              className="w-full text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !selectedProductId}
            className="w-full py-3.5 px-4 bg-primary text-primary-foreground rounded-2xl font-bold text-xs sm:text-sm shadow-md hover:opacity-95 transition-all disabled:opacity-50"
          >
            {submitting ? "Publishing Review..." : "Submit Verified Review"}
          </button>
        </form>
      )}
    </div>
  );
}

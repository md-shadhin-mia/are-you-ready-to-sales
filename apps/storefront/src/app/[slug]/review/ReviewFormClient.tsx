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
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-xs text-blue-600">
              {icon}
            </div>
            <div>
              <p className="font-semibold text-sm text-slate-900">{label}</p>
              <p className="text-xs text-slate-500">{description}</p>
            </div>
          </div>
          <span className="text-sm font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60">
            {value} / 5 Stars
          </span>
        </div>

        <div className="flex items-center gap-2 pt-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              type="button"
              key={star}
              onClick={() => onChange(star)}
              className="p-1 text-slate-300 hover:text-amber-400 focus:outline-hidden transition-colors"
            >
              <Star
                className={`h-7 w-7 transition-all ${
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
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Thank You for Your Feedback!
        </h2>
        <p className="text-sm text-slate-600 mb-6">
          Your verified review has been published. It helps fellow shoppers and
          directly rewards the student entrepreneur running this store.
        </p>

        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-xs font-semibold mb-8 border border-blue-200/60">
          <ShieldCheck className="h-4 w-4" />
          Marked as Verified Purchase
        </div>

        <div>
          <button
            onClick={() => router.push(`/${storeSlug}`)}
            className="inline-flex items-center gap-2 bg-store-primary text-white px-6 py-3 rounded-2xl font-semibold text-sm shadow-sm hover:opacity-95 transition-all"
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
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold border border-blue-200/60">
          <Sparkles className="h-3.5 w-3.5" />
          Customer Feedback Loop
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Share Your Store Experience
        </h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          We separate product quality, seller service, and delivery speed so
          your review is fair and accurate.
        </p>
      </div>

      {/* Verification Step: Lookup by token or Order # + Phone */}
      {!verificationResult ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            Verify Your Purchase
          </h2>

          {verificationError && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {verificationError}
            </div>
          )}

          <form onSubmit={handleManualLookup} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Order Number
              </label>
              <input
                type="text"
                placeholder="e.g. ORD-20260924-1234"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                placeholder="e.g. 01700000000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={verifying}
              className="w-full py-3 bg-store-primary text-white rounded-xl font-semibold text-sm shadow-sm hover:opacity-95 transition-all disabled:opacity-50"
            >
              {verifying ? "Checking Eligibility..." : "Find Delivered Order"}
            </button>
          </form>
        </div>
      ) : (
        /* Review Submission Form */
        <form
          onSubmit={handleSubmitReview}
          className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6"
        >
          {/* Order & Customer Badge */}
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center justify-between text-xs">
            <div>
              <p className="font-semibold text-slate-900">
                Order #{verificationResult.orderNumber}
              </p>
              <p className="text-slate-500">
                Shopper: {verificationResult.customerName}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-green-700 font-semibold bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Verified Order
            </span>
          </div>

          {submitError && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {submitError}
            </div>
          )}

          {/* Item Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Select Item to Review
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {verificationResult.items.map((item: any) => (
                <button
                  type="button"
                  key={item.masterProductId}
                  disabled={item.alreadyReviewed}
                  onClick={() => setSelectedProductId(item.masterProductId)}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                    item.alreadyReviewed
                      ? "opacity-40 bg-slate-100 border-slate-200 cursor-not-allowed"
                      : selectedProductId === item.masterProductId
                        ? "border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/10"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="h-12 w-12 rounded-xl object-contain bg-slate-50 border border-slate-100"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                      <Package className="h-5 w-5" />
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <p className="font-semibold text-xs text-slate-900 truncate">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-slate-500">
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
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Comments on Product Quality (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="How did the product perform? Is the size and build as expected?"
              value={productComment}
              onChange={(e) => setProductComment(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Comments on Seller Service (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Was the merchant polite, helpful, and communicative?"
              value={storeComment}
              onChange={(e) => setStoreComment(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Comments on Delivery (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Did the parcel arrive on time and intact?"
              value={deliveryComment}
              onChange={(e) => setDeliveryComment(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !selectedProductId}
            className="w-full py-3.5 bg-store-primary text-white rounded-2xl font-bold text-sm shadow-md hover:opacity-95 transition-all disabled:opacity-50"
          >
            {submitting ? "Publishing Review..." : "Submit Verified Review"}
          </button>
        </form>
      )}
    </div>
  );
}

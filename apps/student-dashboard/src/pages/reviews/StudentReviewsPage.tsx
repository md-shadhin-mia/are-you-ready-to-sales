import React, { useState, useEffect } from "react";
import {
  Star,
  Search,
  ShieldCheck,
  Package,
  Store,
  Truck,
  MessageSquare,
  AlertTriangle,
  Heart,
  Filter,
} from "lucide-react";
import {
  apiClient,
  Review,
  ReviewDimensionBreakdown,
} from "@repo/api-client";

interface StudentReviewsPageProps {
  token: string;
}

export function StudentReviewsPage({ token }: StudentReviewsPageProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [breakdown, setBreakdown] = useState<ReviewDimensionBreakdown | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [ratingFilter, setRatingFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadReviews();
  }, [ratingFilter, page, token]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const res = await apiClient.reviews.listStudentReviews(
        {
          page,
          limit: 15,
          ratingFilter: ratingFilter === "ALL" ? undefined : ratingFilter,
          search: search || undefined,
        },
        token,
      );
      setReviews(res.items);
      setBreakdown(res.breakdown);
      setTotal(res.total);
    } catch (err) {
      console.error("Failed to load student reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadReviews();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
          <MessageSquare className="h-6 w-6 text-blue-600" />
          Customer Reviews & 3D Feedback
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Monitor your customer satisfaction across Product Quality, Seller Service, and Courier Delivery.
        </p>
      </div>

      {/* 3D Aggregate Breakdown Cards */}
      {breakdown && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase">
              Total Reviews
            </span>
            <p className="text-2xl font-black text-slate-900">
              {breakdown.totalReviews}
            </p>
            <p className="text-[11px] text-slate-400">100% verified purchasers</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-blue-600" />
              Product Quality
            </span>
            <p className="text-2xl font-black text-slate-900 flex items-baseline gap-1">
              {breakdown.averageProductRating}
              <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
            </p>
            <p className="text-[11px] text-slate-400">Master catalog score</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5 text-purple-600" />
              Seller Service
            </span>
            <p className="text-2xl font-black text-slate-900 flex items-baseline gap-1">
              {breakdown.averageStoreRating}
              <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
            </p>
            <p className="text-[11px] text-slate-400">Your store responsiveness</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-emerald-600" />
              Delivery Speed
            </span>
            <p className="text-2xl font-black text-slate-900 flex items-baseline gap-1">
              {breakdown.averageDeliveryRating}
              <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
            </p>
            <p className="text-[11px] text-slate-400">Courier fulfillment speed</p>
          </div>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setRatingFilter("ALL");
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                ratingFilter === "ALL"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Reviews ({total})
            </button>
            <button
              onClick={() => {
                setRatingFilter("5_STAR");
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
                ratingFilter === "5_STAR"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100"
              }`}
            >
              <Heart className="h-3.5 w-3.5 fill-current" />
              5-Star Loved
            </button>
            <button
              onClick={() => {
                setRatingFilter("CRITICAL");
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
                ratingFilter === "CRITICAL"
                  ? "bg-red-600 text-white shadow-xs"
                  : "bg-red-50 text-red-700 hover:bg-red-100"
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Critical (&le; 2 Stars)
            </button>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search feedback or customer..."
                className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-60"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {/* Reviews List */}
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            Loading reviews...
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No reviews match the selected filter.
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="border border-slate-200/80 rounded-2xl p-5 hover:border-slate-300 transition-colors space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center">
                      {rev.customer?.fullName?.[0] || "C"}
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-900 flex items-center gap-2">
                        {rev.customer?.fullName}
                        <span className="text-slate-400 font-normal text-[11px]">
                          ({rev.customer?.phone})
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Order #{rev.order?.orderNumber} •{" "}
                        {new Date(rev.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60 self-start sm:self-auto">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Verified Purchase
                  </span>
                </div>

                {/* 3D Breakdown Scores */}
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                    <Package className="h-3 w-3 text-blue-600" />
                    Product: {rev.productRating} ★
                  </span>
                  <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                    <Store className="h-3 w-3 text-purple-600" />
                    Store Service: {rev.storeRating} ★
                  </span>
                  <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                    <Truck className="h-3 w-3 text-emerald-600" />
                    Delivery: {rev.deliveryRating} ★
                  </span>
                </div>

                {/* Feedback Comments */}
                <div className="bg-slate-50/70 rounded-xl p-3 text-xs space-y-1 text-slate-700 border border-slate-100">
                  {rev.productComment && (
                    <p>
                      <span className="font-semibold text-slate-900">Product: </span>
                      {rev.productComment}
                    </p>
                  )}
                  {rev.storeComment && (
                    <p>
                      <span className="font-semibold text-slate-900">Service: </span>
                      {rev.storeComment}
                    </p>
                  )}
                  {rev.deliveryComment && (
                    <p>
                      <span className="font-semibold text-slate-900">Delivery: </span>
                      {rev.deliveryComment}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

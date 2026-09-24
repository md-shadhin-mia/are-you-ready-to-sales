import React, { useState, useEffect } from "react";
import {
  Shield,
  Star,
  Search,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Filter,
  MessageSquare,
  Package,
  Store,
  Truck,
} from "lucide-react";
import { apiClient, Review } from "@repo/api-client";
import { Button } from "@repo/ui";

interface AdminReviewsPageProps {
  token: string;
}

export function AdminReviewsPage({ token }: AdminReviewsPageProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    loadReviews();
  }, [statusFilter, token]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const res = await apiClient.reviews.listAdminReviews(
        {
          search: search || undefined,
          status: statusFilter === "ALL" ? undefined : statusFilter,
        },
        token,
      );
      setReviews(res.items);
    } catch (err) {
      console.error("Failed to load admin reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadReviews();
  };

  const handleTogglePublish = async (reviewId: string, currentStatus: boolean) => {
    try {
      setTogglingId(reviewId);
      await apiClient.reviews.togglePublish(reviewId, !currentStatus, token);
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, isPublished: !currentStatus } : r,
        ),
      );
    } catch (err) {
      console.error("Failed to toggle publish status:", err);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <MessageSquare className="h-6 w-6 text-blue-600" />
            Review Moderation & Trust Governance
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Audit customer reviews, enforce community guidelines, and unpublish disputed content.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadReviews}
            className="text-xs"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> Filter:
          </span>
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === "ALL"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Reviews
          </button>
          <button
            onClick={() => setStatusFilter("PUBLISHED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === "PUBLISHED"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            Published
          </button>
          <button
            onClick={() => setStatusFilter("UNPUBLISHED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === "UNPUBLISHED"
                ? "bg-amber-600 text-white"
                : "bg-amber-50 text-amber-800 hover:bg-amber-100"
            }`}
          >
            Hidden / Moderated
          </button>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search store, customer, comment..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <Button type="submit" size="sm" className="text-xs font-bold">
            Search
          </Button>
        </form>
      </div>

      {/* Reviews Moderation Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Store & Product</th>
                <th className="py-3 px-4">Customer & Order</th>
                <th className="py-3 px-4">Ratings (Prod / Serv / Deliv)</th>
                <th className="py-3 px-4">Feedback Comments</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Moderation Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading platform reviews...
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No reviews found.
                  </td>
                </tr>
              ) : (
                reviews.map((rev) => (
                  <tr key={rev.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">
                        {rev.store?.storeName}
                      </p>
                      <p className="text-[11px] text-blue-600 font-mono">
                        /{rev.store?.slug}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1 truncate max-w-xs">
                        Item: {rev.masterProduct?.title}
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">
                        {rev.customer?.fullName}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {rev.customer?.phone}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {rev.order?.orderNumber}
                      </p>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 w-12">Product:</span>
                          <span className="font-bold text-slate-900">{rev.productRating} ★</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 w-12">Service:</span>
                          <span className="font-bold text-slate-900">{rev.storeRating} ★</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 w-12">Delivery:</span>
                          <span className="font-bold text-slate-900">{rev.deliveryRating} ★</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-sm">
                      <div className="space-y-1 text-[11px]">
                        {rev.productComment && (
                          <p>
                            <span className="font-semibold text-slate-900">Product: </span>
                            "{rev.productComment}"
                          </p>
                        )}
                        {rev.storeComment && (
                          <p>
                            <span className="font-semibold text-slate-900">Store: </span>
                            "{rev.storeComment}"
                          </p>
                        )}
                        {rev.deliveryComment && (
                          <p>
                            <span className="font-semibold text-slate-900">Delivery: </span>
                            "{rev.deliveryComment}"
                          </p>
                        )}
                        {!rev.productComment && !rev.storeComment && !rev.deliveryComment && (
                          <span className="text-slate-400 italic">No text comments provided</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {rev.isPublished ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" />
                          Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <AlertCircle className="h-3 w-3" />
                          Hidden
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleTogglePublish(rev.id, rev.isPublished)}
                        disabled={togglingId === rev.id}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all shadow-xs ${
                          rev.isPublished
                            ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                        }`}
                      >
                        {rev.isPublished ? (
                          <>
                            <EyeOff className="h-3.5 w-3.5" />
                            Unpublish
                          </>
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5" />
                            Publish
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

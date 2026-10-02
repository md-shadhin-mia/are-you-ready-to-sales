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
import { Button, Input, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui";

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
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Review Moderation & Trust Governance"
        description="Audit customer reviews, enforce community guidelines, and unpublish disputed content."
        icon={MessageSquare}
        actions={
          <>
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
          </>
        }
      />

      {/* Filter & Search Bar */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> Filter:
          </span>
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === "ALL"
                ? "bg-slate-900 text-white"
                : "bg-muted text-slate-600 hover:bg-slate-200"
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
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search store, customer, comment..."
              className="w-full pl-9 pr-3 text-xs"
            />
          </div>
          <Button type="submit" size="sm" className="text-xs font-bold">
            Search
          </Button>
        </form>
      </div>

      {/* Reviews Moderation Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <Table className="w-full text-left text-xs">
            <TableHeader className="bg-muted/50 border-b border-border text-muted-foreground uppercase font-semibold">
              <TableRow>
                <TableHead className="py-3 px-4">Store & Product</TableHead>
                <TableHead className="py-3 px-4">Customer & Order</TableHead>
                <TableHead className="py-3 px-4">Ratings (Prod / Serv / Deliv)</TableHead>
                <TableHead className="py-3 px-4">Feedback Comments</TableHead>
                <TableHead className="py-3 px-4 text-center">Status</TableHead>
                <TableHead className="py-3 px-4 text-right">Moderation Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60 text-slate-700">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-slate-400">
                    Loading platform reviews...
                  </TableCell>
                </TableRow>
              ) : reviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-slate-400">
                    No reviews found.
                  </TableCell>
                </TableRow>
              ) : (
                reviews.map((rev) => (
                  <TableRow key={rev.id} className="hover:bg-muted/50/60 transition-colors">
                    <TableCell className="py-3.5 px-4">
                      <p className="font-bold text-foreground">
                        {rev.store?.storeName}
                      </p>
                      <p className="text-[11px] text-primary font-mono">
                        /{rev.store?.slug}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1 truncate max-w-xs">
                        Item: {rev.masterProduct?.title}
                      </p>
                    </TableCell>

                    <TableCell className="py-3.5 px-4">
                      <p className="font-bold text-foreground">
                        {rev.customer?.fullName}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {rev.customer?.phone}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {rev.order?.orderNumber}
                      </p>
                    </TableCell>

                    <TableCell className="py-3.5 px-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 w-12">Product:</span>
                          <span className="font-bold text-foreground">{rev.productRating} ★</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 w-12">Service:</span>
                          <span className="font-bold text-foreground">{rev.storeRating} ★</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 w-12">Delivery:</span>
                          <span className="font-bold text-foreground">{rev.deliveryRating} ★</span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-3.5 px-4 max-w-sm">
                      <div className="space-y-1 text-[11px]">
                        {rev.productComment && (
                          <p>
                            <span className="font-semibold text-foreground">Product: </span>
                            "{rev.productComment}"
                          </p>
                        )}
                        {rev.storeComment && (
                          <p>
                            <span className="font-semibold text-foreground">Store: </span>
                            "{rev.storeComment}"
                          </p>
                        )}
                        {rev.deliveryComment && (
                          <p>
                            <span className="font-semibold text-foreground">Delivery: </span>
                            "{rev.deliveryComment}"
                          </p>
                        )}
                        {!rev.productComment && !rev.storeComment && !rev.deliveryComment && (
                          <span className="text-slate-400 italic">No text comments provided</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-3.5 px-4 text-center">
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
                    </TableCell>

                    <TableCell className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleTogglePublish(rev.id, rev.isPublished)}
                        disabled={togglingId === rev.id}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all shadow-xs ${
                          rev.isPublished
                            ? "bg-destructive/5 text-destructive hover:bg-red-100 border border-destructive/20"
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

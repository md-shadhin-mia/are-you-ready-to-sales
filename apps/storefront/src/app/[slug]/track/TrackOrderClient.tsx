"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Truck,
  CheckCircle2,
  Clock,
  Package,
  AlertCircle,
  Loader2,
  ExternalLink,
  Star,
} from "lucide-react";

import { Input } from "@repo/ui";
import { API_BASE } from "../../../lib/api-base";
interface TrackOrderClientProps {
  storeSlug: string;
  initialOrderNumber?: string;
}

export function TrackOrderClient({
  storeSlug,
  initialOrderNumber = "",
}: TrackOrderClientProps) {
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTracking = async (numberToFetch: string) => {
    if (!numberToFetch.trim()) return;
    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const res = await fetch(
        `${API_BASE}/api/v1/orders/track/${numberToFetch.trim()}`,
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Order not found. Please verify the number.");
      }

      setOrder(data);
    } catch (err: any) {
      setError(err.message || "Failed to locate tracking information.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrderNumber) {
      fetchTracking(initialOrderNumber);
    }
  }, [initialOrderNumber]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTracking(orderNumber);
  };

  // Step indicator
  const getStepStatus = (currentStatus: string, stepIndex: number) => {
    const sequence = ["PENDING_PAYMENT", "PROCESSING", "SHIPPED", "DELIVERED"];
    const currentIndex = sequence.indexOf(currentStatus);

    if (currentStatus === "CANCELLED" || currentStatus === "RETURNED") {
      return "failed";
    }

    if (currentIndex >= stepIndex) return "completed";
    if (currentIndex === stepIndex - 1) return "current";
    return "upcoming";
  };

  return (
    <div className="space-y-6">
      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
          <Input
            type="text"
            required
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="Order ID (e.g. ORD-...)"
            className="w-full text-xs font-mono pl-10 pr-3 sm:pr-4 uppercase min-w-0"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 sm:px-6 py-3 rounded-2xl font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 shadow-sm disabled:opacity-50 shrink-0"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : "Track"}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-2xl flex items-center gap-3 text-xs text-destructive">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tracking Result View */}
      {order && (
        <div className="bg-card rounded-2xl sm:rounded-3xl border border-border shadow-sm p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
          {/* Header Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-100 pb-4 sm:pb-6">
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Order Tracking
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-foreground font-mono break-all">
                {order.orderNumber}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Placed on {new Date(order.createdAt).toLocaleDateString()} • Destination: {order.recipientCity || "Bangladesh"}
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/5 text-primary border border-primary/20 self-start sm:self-auto shrink-0">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              Status: {order.status}
            </div>
          </div>

          {/* Courier Banner if Shipped */}
          {order.courierName && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-muted/50 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-foreground truncate">
                    Dispatched via {order.courierName}
                  </h4>
                  <p className="text-xs font-mono text-muted-foreground break-all">
                    Tracking Number: <strong>{order.trackingNumber || "Assigned"}</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="py-2 sm:py-4">
            <div className="grid grid-cols-4 gap-1 sm:gap-2 text-center">
              {[
                { title: "Placed", icon: CheckCircle2, step: 0 },
                { title: "Processing", icon: Package, step: 1 },
                { title: "Shipped", icon: Truck, step: 2 },
                { title: "Delivered", icon: CheckCircle2, step: 3 },
              ].map((item, idx) => {
                const status = getStepStatus(order.status, item.step);
                const isCompleted = status === "completed";
                const isCurrent = status === "current";

                return (
                  <div key={idx} className="space-y-1.5 sm:space-y-2 flex flex-col items-center min-w-0">
                    <div
                      className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center transition-all shrink-0 ${
                        isCompleted
                          ? "bg-emerald-600 text-primary-foreground shadow-sm"
                          : isCurrent
                            ? "bg-primary text-primary-foreground hover:bg-primary/90 text-primary-foreground ring-4 ring-ring"
                            : "bg-muted text-slate-400"
                      }`}
                    >
                      <item.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <span
                      className={`text-[10px] sm:text-xs font-semibold block truncate max-w-full px-0.5 ${
                        isCompleted || isCurrent
                          ? "text-foreground font-bold"
                          : "text-slate-400"
                      }`}
                    >
                      {item.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Items Summary */}
          <div className="pt-6 border-t border-slate-100 space-y-3">
            <h4 className="text-xs font-bold text-slate-700">Purchased Items</h4>
            <div className="divide-y divide-border/60 text-xs">
              {order.items?.map((item: any) => (
                <div key={item.id} className="py-2.5 flex justify-between items-center">
                  <span className="font-medium text-slate-800">
                    {item.title} × {item.quantity}
                  </span>
                  <span className="font-bold text-foreground">
                    ৳{item.totalPrice?.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Delivered Callout: Leave a Review */}
          {(order.status === "DELIVERED" || order.status === "COMPLETED") && (
            <div className="pt-6 border-t border-slate-100">
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
                    <Star className="h-5 w-5 fill-amber-400 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">
                      Your parcel was successfully delivered!
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Leave an independent 3D review for product, service, and courier speed.
                    </p>
                  </div>
                </div>

                <a
                  href={`/${storeSlug}/review?${
                    order.reviewToken ? `token=${order.reviewToken}` : `orderNumber=${order.orderNumber}`
                  }`}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs shadow-xs hover:bg-slate-800 transition-colors shrink-0"
                >
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  Write Review
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

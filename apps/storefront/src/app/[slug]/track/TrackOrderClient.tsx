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
} from "lucide-react";

interface TrackOrderClientProps {
  storeSlug: string;
  initialOrderNumber?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            required
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="Enter Order ID (e.g. ORD-20260924-1234)"
            className="w-full text-xs font-mono pl-10 pr-4 py-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm uppercase"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 rounded-2xl font-bold text-xs btn-store-primary flex items-center gap-2 shadow-sm disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Track"}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-xs text-red-700">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tracking Result View */}
      {order && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-8">
          {/* Header Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Order Tracking
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 font-mono">
                {order.orderNumber}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Placed on {new Date(order.createdAt).toLocaleDateString()} • Destination: {order.recipientCity || "Bangladesh"}
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 self-start sm:self-auto">
              <Clock className="h-3.5 w-3.5" />
              Status: {order.status}
            </div>
          </div>

          {/* Courier Banner if Shipped */}
          {order.courierName && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Truck className="h-6 w-6 text-store-primary flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Dispatched via {order.courierName}
                  </h4>
                  <p className="text-xs font-mono text-slate-500">
                    Tracking Number: <strong>{order.trackingNumber || "Assigned"}</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="py-4">
            <div className="grid grid-cols-4 gap-2 text-center">
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
                  <div key={idx} className="space-y-2 flex flex-col items-center">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${
                        isCompleted
                          ? "bg-emerald-600 text-white shadow-sm"
                          : isCurrent
                            ? "btn-store-primary text-white ring-4 ring-blue-100"
                            : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        isCompleted || isCurrent
                          ? "text-slate-900 font-bold"
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
            <div className="divide-y divide-slate-100 text-xs">
              {order.items?.map((item: any) => (
                <div key={item.id} className="py-2.5 flex justify-between items-center">
                  <span className="font-medium text-slate-800">
                    {item.title} × {item.quantity}
                  </span>
                  <span className="font-bold text-slate-900">
                    ৳{item.totalPrice?.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

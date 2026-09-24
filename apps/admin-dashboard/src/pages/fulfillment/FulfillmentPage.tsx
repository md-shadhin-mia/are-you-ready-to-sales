import React, { useState, useEffect } from "react";
import { apiClient, Order } from "@repo/api-client";
import {
  Truck,
  Package,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Loader2,
  X,
  ExternalLink,
  ChevronRight,
  Store,
} from "lucide-react";
import { Button } from "@repo/ui";

interface FulfillmentPageProps {
  token: string;
}

const COURIER_OPTIONS = [
  "Steadfast Courier",
  "Pathao Logistics",
  "RedX Express",
  "Paperfly",
  "Sundarban Courier",
];

export const FulfillmentPage: React.FC<FulfillmentPageProps> = ({ token }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  // Dispatch Modal
  const [dispatchOrder, setDispatchOrder] = useState<any | null>(null);
  const [courierName, setCourierName] = useState(COURIER_OPTIONS[0]);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [dispatching, setDispatching] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, [token, statusFilter, search]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await apiClient.orders.listAdmin(
        {
          status: statusFilter || undefined,
          search: search || undefined,
        },
        token,
      );
      setOrders(res.data || []);
      setMeta(res.meta);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDispatch = (order: any) => {
    setDispatchOrder(order);
    setCourierName(order.courierName || COURIER_OPTIONS[0]);
    setTrackingNumber(order.trackingNumber || `ST-${Math.floor(100000 + Math.random() * 900000)}`);
    setActionError(null);
  };

  const handleSubmitDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchOrder) return;
    setDispatching(true);
    setActionError(null);

    try {
      await apiClient.orders.dispatch(
        dispatchOrder.id,
        {
          courierName,
          trackingNumber,
        },
        token,
      );
      setDispatchOrder(null);
      loadOrders();
    } catch (err: any) {
      setActionError(err.message || "Failed to dispatch order");
    } finally {
      setDispatching(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, toStatus: string) => {
    try {
      await apiClient.orders.updateStatus(orderId, toStatus, token);
      loadOrders();
    } catch (err: any) {
      alert(err.message || `Failed to transition order status to ${toStatus}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DELIVERED":
      case "COMPLETED":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "SHIPPED":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "PROCESSING":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "CANCELLED":
      case "RETURNED":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Order Fulfillment Operations
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Centralized institute logistics queue across all student reseller stores.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order #, store, phone..."
            className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {["", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              statusFilter === st
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {st === "" ? "All Queue" : st}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500 flex items-center justify-center gap-2 bg-white rounded-3xl border border-slate-200">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          Loading warehouse fulfillment queue...
        </div>
      ) : orders.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-slate-200 p-8">
          <Package className="h-12 w-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">Fulfillment queue empty</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No orders matching the current filter. New orders placed by customers will arrive here in real time.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 divide-y divide-slate-100">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Order & Reseller Store</th>
                  <th className="py-3.5 px-6">Customer & Address</th>
                  <th className="py-3.5 px-6">Wholesale Cost</th>
                  <th className="py-3.5 px-6">Customer Total</th>
                  <th className="py-3.5 px-6">Status & Courier</th>
                  <th className="py-3.5 px-6 text-right">Fulfillment Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {orders.map((o) => {
                  const addr = o.shippingAddress || {};
                  return (
                    <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6">
                        <p className="font-extrabold text-slate-900 font-mono">
                          {o.orderNumber}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-blue-600 font-semibold mt-0.5">
                          <Store className="h-3 w-3" />
                          <span>{o.store?.storeName}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <p className="font-bold text-slate-900">{o.customer?.fullName}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{o.customer?.phone}</p>
                        <p className="text-[10px] text-slate-400 truncate max-w-xs mt-0.5">
                          {addr.addressLine}, {addr.city}
                        </p>
                      </td>

                      <td className="py-4 px-6 font-semibold text-slate-600">
                        ৳{Number(o.totalBaseCost).toLocaleString()}
                      </td>

                      <td className="py-4 px-6 font-bold text-slate-900">
                        ৳{Number(o.totalAmount).toLocaleString()}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {o.paymentMethod} • {o.paymentStatus}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${getStatusBadge(
                              o.status,
                            )}`}
                          >
                            {o.status}
                          </span>
                          {o.courierName && (
                            <p className="text-[10px] text-slate-500 font-mono">
                              {o.courierName}: {o.trackingNumber}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-6 text-right space-x-1.5">
                        {o.status === "PROCESSING" && (
                          <Button
                            size="sm"
                            onClick={() => handleOpenDispatch(o)}
                            className="text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-2.5 py-1"
                          >
                            <Truck className="h-3.5 w-3.5 mr-1" />
                            Dispatch
                          </Button>
                        )}

                        {o.status === "SHIPPED" && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateStatus(o.id, "DELIVERED")}
                            className="text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-2.5 py-1"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Delivered
                          </Button>
                        )}

                        {o.status !== "DELIVERED" && o.status !== "CANCELLED" && (
                          <button
                            onClick={() => {
                              if (confirm("Cancel order and restitute inventory back to master catalog?")) {
                                handleUpdateStatus(o.id, "CANCELLED");
                              }
                            }}
                            className="px-2 py-1 text-[11px] font-semibold text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Courier Dispatch Modal */}
      {dispatchOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Dispatch Order with Courier
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Order: {dispatchOrder.orderNumber}
                </p>
              </div>
              <button
                onClick={() => setDispatchOrder(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitDispatch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Courier Service Partner *
                </label>
                <select
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {COURIER_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Courier Tracking ID / Consignment # *
                </label>
                <input
                  type="text"
                  required
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. ST-998877"
                  className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                />
              </div>

              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-xl">
                  {actionError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDispatchOrder(null)}
                  className="flex-1 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={dispatching}
                  className="flex-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                >
                  {dispatching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Confirm Dispatch"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

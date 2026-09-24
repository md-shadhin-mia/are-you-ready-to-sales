import React, { useState, useEffect } from "react";
import { apiClient, Order } from "@repo/api-client";
import {
  Package,
  Clock,
  CheckCircle2,
  TrendingUp,
  Search,
  Truck,
  Loader2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

interface StudentOrdersPageProps {
  token: string;
}

export const StudentOrdersPage: React.FC<StudentOrdersPageProps> = ({ token }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  useEffect(() => {
    loadOrders();
  }, [token, statusFilter, search]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await apiClient.orders.listStudent(
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

  // Metrics
  const totalProfit = orders.reduce((sum, o) => sum + Number(o.studentNetProfit || 0), 0);
  const deliveredCount = orders.filter((o) => o.status === "DELIVERED" || o.status === "COMPLETED").length;

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
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Orders
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{meta.total}</h3>
          </div>
          <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Package className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Delivered
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{deliveredCount}</h3>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Student Net Profit
            </p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">
              ৳{totalProfit.toLocaleString()}
            </h3>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {["", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {st === "" ? "All Orders" : st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order # or phone..."
            className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
      </div>

      {/* Orders List Table */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500 flex items-center justify-center gap-2 bg-white rounded-3xl border border-slate-200">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          Loading store orders...
        </div>
      ) : orders.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-slate-200 p-8">
          <Package className="h-12 w-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No orders placed yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Once customers purchase items on your storefront, orders and live profit credits will show up here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 divide-y divide-slate-100">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Order ID & Date</th>
                  <th className="py-3.5 px-6">Customer</th>
                  <th className="py-3.5 px-6">Total Amount</th>
                  <th className="py-3.5 px-6">Your Net Profit</th>
                  <th className="py-3.5 px-6">Payment</th>
                  <th className="py-3.5 px-6">Fulfillment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-extrabold text-slate-900 font-mono">
                        {o.orderNumber}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(o.createdAt).toLocaleDateString()}
                      </p>
                    </td>

                    <td className="py-4 px-6">
                      <p className="font-bold text-slate-900">{o.customer?.fullName}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{o.customer?.phone}</p>
                    </td>

                    <td className="py-4 px-6 font-bold text-slate-900">
                      ৳{Number(o.totalAmount).toLocaleString()}
                    </td>

                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full text-xs border border-emerald-200">
                        +৳{Number(o.studentNetProfit).toLocaleString()}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <span className="font-semibold text-slate-800">{o.paymentMethod}</span>
                      <p className="text-[10px] text-slate-400 uppercase">{o.paymentStatus}</p>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

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

import { Input, PageHeader, StatCard, StatusBadge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui";
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


  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders & Profits"
        description="Track every customer order from your store, its fulfillment status and the profit you earn."
        icon={Truck}
      />

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Orders" value={<>{meta.total}</>} icon={Package} />

        <StatCard label="Delivered" value={<>{deliveredCount}</>} icon={CheckCircle2} />

        <StatCard label="Student Net Profit" value={<><span className="text-emerald-600">৳{totalProfit.toLocaleString()}</span></>} icon={TrendingUp} />
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
                  : "bg-card text-slate-600 border border-border hover:bg-muted/50"
              }`}
            >
              {st === "" ? "All Orders" : st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order # or phone..."
            className="w-full text-xs pl-9 pr-3.5"
          />
        </div>
      </div>

      {/* Orders List Table */}
      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground flex items-center justify-center gap-2 bg-card rounded-xl border border-border">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Loading store orders...
        </div>
      ) : orders.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-card rounded-xl border border-border p-8">
          <Package className="h-12 w-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No orders placed yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Once customers purchase items on your storefront, orders and live profit credits will show up here.
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <Table className="w-full text-left text-xs text-slate-700 divide-y divide-border/60">
              <TableHeader className="bg-muted/50 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <TableRow>
                  <TableHead className="py-3.5 px-6">Order ID & Date</TableHead>
                  <TableHead className="py-3.5 px-6">Customer</TableHead>
                  <TableHead className="py-3.5 px-6">Total Amount</TableHead>
                  <TableHead className="py-3.5 px-6">Your Net Profit</TableHead>
                  <TableHead className="py-3.5 px-6">Payment</TableHead>
                  <TableHead className="py-3.5 px-6">Fulfillment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/60 font-medium">
                {orders.map((o) => (
                  <TableRow key={o.id} className="hover:bg-muted/50/70 transition-colors">
                    <TableCell className="py-4 px-6">
                      <p className="font-extrabold text-foreground font-mono">
                        {o.orderNumber}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(o.createdAt).toLocaleDateString()}
                      </p>
                    </TableCell>

                    <TableCell className="py-4 px-6">
                      <p className="font-bold text-foreground">{o.customer?.fullName}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{o.customer?.phone}</p>
                    </TableCell>

                    <TableCell className="py-4 px-6 font-bold text-foreground">
                      ৳{Number(o.totalAmount).toLocaleString()}
                    </TableCell>

                    <TableCell className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full text-xs border border-emerald-200">
                        +৳{Number(o.studentNetProfit).toLocaleString()}
                      </span>
                    </TableCell>

                    <TableCell className="py-4 px-6">
                      <span className="font-semibold text-slate-800">{o.paymentMethod}</span>
                      <p className="text-[10px] text-slate-400 uppercase">{o.paymentStatus}</p>
                    </TableCell>

                    <TableCell className="py-4 px-6">
                      <div className="space-y-1">
                        <StatusBadge status={o.status} />
                        {o.courierName && (
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {o.courierName}: {o.trackingNumber}
                          </p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
};

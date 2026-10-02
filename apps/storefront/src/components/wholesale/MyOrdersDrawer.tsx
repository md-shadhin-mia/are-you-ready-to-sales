"use client";

import React, { useEffect, useState } from "react";
import { ResellerUser, WholesaleOrderConfirmation } from "./types";

interface MyOrdersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: ResellerUser | null;
  onOpenLogin: () => void;
}

export function MyOrdersDrawer({
  isOpen,
  onClose,
  user,
  onOpenLogin,
}: MyOrdersDrawerProps) {
  const [orders, setOrders] = useState<WholesaleOrderConfirmation[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const fetchOrders = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token =
        localStorage.getItem("wholesale_token") ||
        localStorage.getItem("student_token") ||
        "";
      const res = await fetch("/api/v1/student/wholesale/orders", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.items) {
        setOrders(data.items);
      }
    } catch (e) {
      console.error("Failed to load wholesale orders", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      fetchOrders();
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-lg bg-white shadow-2xl flex flex-col border-l border-slate-200">
          {/* Header */}
          <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-brand flex items-center justify-center border border-blue-200/60">
                <span className="material-symbols-outlined text-[20px]">inventory</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-tight">
                  My Wholesale Purchases
                </h2>
                <p className="text-xs text-slate-500">
                  {user ? user.fullName : "Reseller Procurement History"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {user && (
                <button
                  onClick={fetchOrders}
                  disabled={loading}
                  className="w-8 h-8 rounded-lg hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
                  title="Refresh Orders"
                >
                  <span className={`material-symbols-outlined text-[18px] ${loading ? "animate-spin" : ""}`}>
                    refresh
                  </span>
                </button>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5">
            {!user ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-brand flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-[28px]">lock</span>
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Reseller Authentication Required</h3>
                <p className="text-xs text-slate-500 max-w-xs mt-1 mb-4">
                  Sign in with your verified B2B account to view your past wholesale orders and tracking status.
                </p>
                <button
                  onClick={onOpenLogin}
                  className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-xs shadow-sm transition-colors"
                >
                  Sign In as Reseller
                </button>
              </div>
            ) : loading ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <div className="w-8 h-8 border-3 border-brand/20 border-t-brand rounded-full animate-spin mb-3"></div>
                <p className="text-xs font-semibold">Loading orders from database...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-[28px]">receipt</span>
                </div>
                <h3 className="font-bold text-slate-800 text-sm">No Wholesale Orders Yet</h3>
                <p className="text-xs text-slate-500 max-w-xs mt-1">
                  You haven't placed any bulk wholesale inventory orders. Browse our catalog and start sourcing!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((o) => {
                  const isExpanded = expandedOrderId === o.id;
                  const dateStr = new Date(o.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  return (
                    <div
                      key={o.id}
                      className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs hover:border-slate-300 transition-all"
                    >
                      {/* Top Summary Bar */}
                      <div className="p-4 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-900">
                              {o.orderNumber}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                o.status === "DELIVERED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : o.status === "DISPATCHED"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {o.status}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 mt-0.5 block">
                            {dateStr} &bull; {o.paymentMethod}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-extrabold text-brand">
                            ৳{Number(o.totalAmount).toLocaleString()}
                          </div>
                          <span className="text-[10px] text-slate-500">
                            {o.items?.length || 0} Products
                          </span>
                        </div>
                      </div>

                      {/* Items details toggle */}
                      <div className="p-4">
                        <button
                          onClick={() => setExpandedOrderId(isExpanded ? null : o.id)}
                          className="w-full text-xs font-semibold text-slate-600 hover:text-brand flex items-center justify-between"
                        >
                          <span>{isExpanded ? "Hide Order Items" : "View Ordered Items"}</span>
                          <span className="material-symbols-outlined text-[16px]">
                            {isExpanded ? "expand_less" : "expand_more"}
                          </span>
                        </button>

                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5">
                            {o.items?.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between text-xs py-1"
                              >
                                <div className="min-w-0 pr-2">
                                  <p className="font-semibold text-slate-800 truncate">
                                    {item.masterProduct?.title || "Wholesale Product"}
                                  </p>
                                  <span className="text-[11px] text-slate-500">
                                    Qty: {item.quantity} &times; ৳{Number(item.unitPrice).toLocaleString()}
                                  </span>
                                </div>
                                <span className="font-bold text-slate-900 whitespace-nowrap">
                                  ৳{Number(item.totalPrice).toLocaleString()}
                                </span>
                              </div>
                            ))}

                            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
                              <span>Shipping: ৳{Number(o.shippingFee).toLocaleString()}</span>
                              <span className="font-semibold text-slate-700">
                                Payment: {o.paymentStatus}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

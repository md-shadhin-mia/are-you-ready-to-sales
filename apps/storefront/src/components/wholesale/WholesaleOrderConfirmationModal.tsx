"use client";

import React from "react";
import { WholesaleOrderConfirmation } from "./types";

interface WholesaleOrderConfirmationModalProps {
  order: WholesaleOrderConfirmation | null;
  onClose: () => void;
  onViewOrders: () => void;
}

export function WholesaleOrderConfirmationModal({
  order,
  onClose,
  onViewOrders,
}: WholesaleOrderConfirmationModalProps) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-center p-6 space-y-5">
        {/* Success Icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center ring-8 ring-emerald-50">
          <span className="material-symbols-outlined text-[36px]">check_circle</span>
        </div>

        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Order Authorized &bull; Queued for Dispatch
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 mt-2">
            Wholesale Order Confirmed!
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Your inventory purchase order has been received by the warehouse dispatch engine.
          </p>
        </div>

        {/* PO Number Box */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Purchase Order No:</span>
            <span className="text-xs font-mono font-bold text-brand bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {order.orderNumber}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Settlement Method:</span>
            <span className="font-bold text-slate-800">
              {order.paymentMethod === "WALLET"
                ? "Reseller Wallet (Paid)"
                : order.paymentMethod === "COD"
                ? "Cash on Delivery (Pay on Receipt)"
                : "Bank Wire Transfer"}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Total B2B Value:</span>
            <span className="font-extrabold text-slate-900 text-sm">
              ৳{Number(order.totalAmount).toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 text-slate-600">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-brand">local_shipping</span>
              Dispatch Hub:
            </span>
            <span className="font-semibold text-slate-800">Dhaka Metro Central Hub (Same Day)</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => {
              onClose();
              onViewOrders();
            }}
            className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">receipt_long</span>
            <span>View Orders</span>
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-xs shadow-md shadow-brand/20 flex items-center justify-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">storefront</span>
            <span>Continue Sourcing</span>
          </button>
        </div>
      </div>
    </div>
  );
}

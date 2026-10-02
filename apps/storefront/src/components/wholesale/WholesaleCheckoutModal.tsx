"use client";

import React, { useState } from "react";
import { ResellerUser, WholesaleCartItem, WholesaleOrderConfirmation } from "./types";

interface WholesaleCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: WholesaleCartItem[];
  user: ResellerUser | null;
  walletBalance: number;
  onOpenLogin: () => void;
  onOrderSuccess: (order: WholesaleOrderConfirmation) => void;
}

export function WholesaleCheckoutModal({
  isOpen,
  onClose,
  items,
  user,
  walletBalance,
  onOpenLogin,
  onOrderSuccess,
}: WholesaleCheckoutModalProps) {
  const [recipientName, setRecipientName] = useState(user?.fullName || "MD Shadhin");
  const [companyName, setCompanyName] = useState(user?.storeName || "Apex Retail & Wholesale");
  const [phone, setPhone] = useState(user?.phone || "+880 1712-345678");
  const [address, setAddress] = useState("Plot 14, Block C, Banani Commercial Area");
  const [city, setCity] = useState("Dhaka");
  const [postalCode, setPostalCode] = useState("1213");
  const [paymentMethod, setPaymentMethod] = useState<"WALLET" | "COD" | "BANK_TRANSFER">("COD");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const shippingFee = subtotal >= 5000 || subtotal === 0 ? 0 : 120;
  const totalAmount = subtotal + shippingFee;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenLogin();
      return;
    }

    if (paymentMethod === "WALLET" && walletBalance < totalAmount) {
      setError(`Insufficient wallet balance (৳${walletBalance.toLocaleString()}). Please select COD or Bank Transfer.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token =
        localStorage.getItem("wholesale_token") ||
        localStorage.getItem("student_token") ||
        "";

      const payload = {
        paymentMethod,
        shippingAddress: {
          recipientName,
          fullName: recipientName,
          phone,
          companyName,
          addressLine: address,
          address,
          city,
          postalCode,
        },
        items: items.map((i) => ({
          masterProductId: i.product.id,
          quantity: i.quantity,
        })),
        notes: notes.trim() || undefined,
      };

      const res = await fetch("/api/v1/student/wholesale/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to submit wholesale order.");
      }

      onOrderSuccess(data);
      onClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while placing order.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[22px]">assignment_turned_in</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Wholesale Order Finalization
              </h2>
              <p className="text-xs text-slate-500">
                Direct dispatch from Central Logistics Center &bull; Blind Packaging
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Not Logged In Warning Banner */}
        {!user && (
          <div className="p-4 bg-amber-50 border-b border-amber-200/80 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-xs text-amber-900 font-medium">
              <span className="material-symbols-outlined text-amber-700 text-[20px]">lock</span>
              <span>
                You must be signed in as a verified reseller to authorize wholesale purchase orders.
              </span>
            </div>
            <button
              onClick={onOpenLogin}
              className="px-3.5 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs shadow-2xs whitespace-nowrap"
            >
              Sign In Now
            </button>
          </div>
        )}

        {error && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-rose-600">error</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handlePlaceOrder} className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Form: Address & Payment (7 Cols) */}
          <div className="md:col-span-7 space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-brand">local_shipping</span>
                1. Delivery & Consignee Information
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Contact Person</label>
                  <input
                    type="text"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-brand outline-none"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Business / Outlet</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-brand outline-none"
                    placeholder="Store Name"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Phone (OTP/Delivery SMS)</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-brand outline-none"
                    placeholder="+880 17..."
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Delivery Address</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-brand outline-none"
                    placeholder="Road, House, Sector/Area"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">City / District</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-brand outline-none"
                    placeholder="Dhaka"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Postal Code</label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-brand outline-none"
                    placeholder="1212"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-brand">payments</span>
                2. Wholesale Payment Settlement
              </h3>
              <div className="space-y-2">
                {/* Wallet Balance Option */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === "WALLET"
                      ? "border-brand bg-blue-50/50 ring-1 ring-brand"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="WALLET"
                    checked={paymentMethod === "WALLET"}
                    onChange={() => setPaymentMethod("WALLET")}
                    className="mt-0.5 text-brand focus:ring-brand"
                  />
                  <div className="flex-1 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-brand">account_balance_wallet</span>
                        Reseller Wallet Balance
                      </span>
                      <span className="text-emerald-700 font-bold">
                        Available: ৳{walletBalance.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Instant automatic deduction from your reseller platform earnings.
                    </p>
                  </div>
                </label>

                {/* Cash on Delivery Option */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === "COD"
                      ? "border-brand bg-blue-50/50 ring-1 ring-brand"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="COD"
                    checked={paymentMethod === "COD"}
                    onChange={() => setPaymentMethod("COD")}
                    className="mt-0.5 text-brand focus:ring-brand"
                  />
                  <div className="flex-1 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-emerald-600">local_shipping</span>
                        Cash on Delivery (COD) / Carrier Collect
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                        Popular
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Pay cash upon delivery verification at your retail location.
                    </p>
                  </div>
                </label>

                {/* Direct Bank Transfer Option */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === "BANK_TRANSFER"
                      ? "border-brand bg-blue-50/50 ring-1 ring-brand"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="BANK_TRANSFER"
                    checked={paymentMethod === "BANK_TRANSFER"}
                    onChange={() => setPaymentMethod("BANK_TRANSFER")}
                    className="mt-0.5 text-brand focus:ring-brand"
                  />
                  <div className="flex-1 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-blue-600">account_balance</span>
                        B2B Bank Wire / Corporate Transfer
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      City Bank A/C: 150248291001 &bull; Routing: 225260783 &bull; WIN B2B Hub
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Order Notes */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                Internal PO Notes / Dropship Label Reference (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Please blind-ship with reseller invoice only. Fragile items."
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-brand outline-none"
              />
            </div>
          </div>

          {/* Right Column: Order Review & Confirmation (5 Cols) */}
          <div className="md:col-span-5 bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center justify-between">
                <span>Order Summary</span>
                <span className="text-[11px] text-brand font-semibold">{items.length} Lines</span>
              </h3>

              {/* Items scroll */}
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
                {items.map((i) => (
                  <div key={i.product.id} className="pt-2 first:pt-0 flex items-center gap-2.5">
                    <img
                      src={i.product.image}
                      alt={i.product.title}
                      className="w-10 h-10 rounded-lg object-cover border border-slate-200 bg-white flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0 text-xs">
                      <p className="font-semibold text-slate-900 truncate">{i.product.title}</p>
                      <div className="text-[11px] text-slate-500">
                        {i.quantity} &times; ৳{i.product.price}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-900">
                      ৳{(i.quantity * i.product.price).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              {/* Cost Calculations */}
              <div className="pt-4 border-t border-slate-200 space-y-1.5 text-xs text-slate-600 mt-4">
                <div className="flex justify-between">
                  <span>Wholesale Subtotal</span>
                  <span className="font-semibold text-slate-900">৳{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Logistics & Freight</span>
                  <span className="font-semibold text-slate-900">
                    {shippingFee === 0 ? "FREE" : `৳${shippingFee}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Payable Amount</span>
                  <span className="text-brand">৳{totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2">
              <button
                type="submit"
                disabled={loading || !user}
                className="w-full py-3 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-sm shadow-md shadow-brand/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">lock</span>
                    <span>Confirm Wholesale Purchase</span>
                  </>
                )}
              </button>
              <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 text-center">
                <span className="material-symbols-outlined text-[14px] text-emerald-600">verified</span>
                <span>Protected by WIN B2B Wholesale Guarantee</span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "../../../store/useCart";
import {
  ShoppingBag,
  CreditCard,
  Truck,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface CheckoutFormClientProps {
  storeSlug: string;
}

const BANGLADESH_DISTRICTS = [
  "Dhaka",
  "Chattogram",
  "Sylhet",
  "Rajshahi",
  "Khulna",
  "Barishal",
  "Rangpur",
  "Mymensingh",
  "Gazipur",
  "Narayanganj",
  "Cumilla",
  "Bogura",
  "Cox's Bazar",
  "Jessore",
  "Other District",
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function CheckoutFormClient({ storeSlug }: CheckoutFormClientProps) {
  const router = useRouter();
  const { items, getSubtotal, clearCart } = useCart();
  const [mounted, setMounted] = useState(false);

  // Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("Dhaka");
  const [district, setDistrict] = useState("Dhaka");
  const [isInsideDhaka, setIsInsideDhaka] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "BKASH" | "NAGAD">("COD");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDistrictChange = (dist: string) => {
    setDistrict(dist);
    const inside = dist.toLowerCase() === "dhaka";
    setIsInsideDhaka(inside);
  };

  if (!mounted) return null;

  const subtotal = getSubtotal();
  const shippingFee = isInsideDhaka ? 80 : 150;
  const totalAmount = subtotal + shippingFee;

  if (items.length === 0) {
    return (
      <div className="py-20 text-center space-y-4 bg-white rounded-3xl border border-slate-200 p-8">
        <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <ShoppingBag className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Your Cart is Empty</h2>
          <p className="text-xs text-slate-500 mt-1">
            Please add products to your cart before proceeding to checkout.
          </p>
        </div>
        <Link
          href={`/${storeSlug}`}
          className="inline-flex px-6 py-3 rounded-xl font-bold text-xs btn-store-primary shadow-sm"
        >
          Return to Store
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !phone.trim() || !addressLine.trim()) {
      setError("Please fill in your name, contact phone number, and address.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        customerName: fullName.trim(),
        customerPhone: phone.trim(),
        customerEmail: email.trim() || undefined,
        shippingAddress: {
          recipientName: fullName.trim(),
          phone: phone.trim(),
          addressLine: addressLine.trim(),
          city: city.trim() || district,
          district: district,
          isInsideDhaka: isInsideDhaka,
        },
        items: items.map((i) => ({
          storeProductId: i.storeProductId,
          quantity: i.quantity,
        })),
        paymentMethod: paymentMethod,
      };

      const res = await fetch(`${API_BASE}/api/v1/stores/${storeSlug}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to process checkout");
      }

      clearCart();

      // If online payment has redirect URL
      if (data.paymentUrl && paymentMethod !== "COD") {
        window.location.href = data.paymentUrl;
      } else {
        router.push(`/${storeSlug}/order-confirmation/${data.orderNumber}`);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during checkout.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column: Details (7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        {/* Customer Information */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="font-extrabold text-base text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <span className="h-5 w-5 rounded-full btn-store-primary text-[11px] font-bold flex items-center justify-center">
              1
            </span>
            Contact & Customer Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Karim Ullah"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mobile Number *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01811223344"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Email Address (Optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="buyer@example.com"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="font-extrabold text-base text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <span className="h-5 w-5 rounded-full btn-store-primary text-[11px] font-bold flex items-center justify-center">
              2
            </span>
            Delivery Address
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                District / Region *
              </label>
              <select
                value={district}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {BANGLADESH_DISTRICTS.map((dist) => (
                  <option key={dist} value={dist}>
                    {dist}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                City / Area *
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Banani, Uttara, Mirpur"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Full Street Address *
            </label>
            <textarea
              required
              rows={2}
              value={addressLine}
              onChange={(e) => setAddressLine(e.target.value)}
              placeholder="House #, Road #, Sector/Block, Landmark details"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Delivery Region Fee Notice */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-600">
              Delivery zone: <strong>{isInsideDhaka ? "Inside Dhaka (৳80)" : "Outside Dhaka (৳150)"}</strong>
            </span>
            <button
              type="button"
              onClick={() => setIsInsideDhaka(!isInsideDhaka)}
              className="text-store-primary font-bold hover:underline"
            >
              Toggle zone
            </button>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="font-extrabold text-base text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <span className="h-5 w-5 rounded-full btn-store-primary text-[11px] font-bold flex items-center justify-center">
              3
            </span>
            Payment Method
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* COD */}
            <label
              className={`p-4 rounded-xl border-2 cursor-pointer flex flex-col justify-between transition-all ${
                paymentMethod === "COD"
                  ? "border-store-primary bg-store-primary-soft shadow-sm"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="payment"
                value="COD"
                checked={paymentMethod === "COD"}
                onChange={() => setPaymentMethod("COD")}
                className="sr-only"
              />
              <div className="flex items-center justify-between">
                <Truck className="h-5 w-5 text-slate-700" />
                {paymentMethod === "COD" && (
                  <CheckCircle className="h-4 w-4 text-store-primary" />
                )}
              </div>
              <div className="mt-3">
                <p className="font-bold text-xs text-slate-900">Cash on Delivery</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Pay in cash at doorstep</p>
              </div>
            </label>

            {/* bKash */}
            <label
              className={`p-4 rounded-xl border-2 cursor-pointer flex flex-col justify-between transition-all ${
                paymentMethod === "BKASH"
                  ? "border-pink-600 bg-pink-50 shadow-sm"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="payment"
                value="BKASH"
                checked={paymentMethod === "BKASH"}
                onChange={() => setPaymentMethod("BKASH")}
                className="sr-only"
              />
              <div className="flex items-center justify-between">
                <span className="font-black text-pink-600 text-sm">bKash</span>
                {paymentMethod === "BKASH" && (
                  <CheckCircle className="h-4 w-4 text-pink-600" />
                )}
              </div>
              <div className="mt-3">
                <p className="font-bold text-xs text-slate-900">bKash Gateway</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Instant online payment</p>
              </div>
            </label>

            {/* Nagad */}
            <label
              className={`p-4 rounded-xl border-2 cursor-pointer flex flex-col justify-between transition-all ${
                paymentMethod === "NAGAD"
                  ? "border-orange-600 bg-orange-50 shadow-sm"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="payment"
                value="NAGAD"
                checked={paymentMethod === "NAGAD"}
                onChange={() => setPaymentMethod("NAGAD")}
                className="sr-only"
              />
              <div className="flex items-center justify-between">
                <span className="font-black text-orange-600 text-sm">Nagad</span>
                {paymentMethod === "NAGAD" && (
                  <CheckCircle className="h-4 w-4 text-orange-600" />
                )}
              </div>
              <div className="mt-3">
                <p className="font-bold text-xs text-slate-900">Nagad MFS</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Mobile wallet payment</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Right Column: Order Summary (5 cols) */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 sticky top-24">
          <h2 className="font-extrabold text-base text-slate-900 border-b border-slate-100 pb-3">
            Order Summary ({items.length} items)
          </h2>

          {/* Items Preview */}
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {items.map((item) => (
              <div
                key={item.storeProductId}
                className="flex items-center gap-3 text-xs"
              >
                <div className="h-10 w-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ShoppingBag className="h-4 w-4 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">
                    {item.title}
                  </p>
                  <p className="text-slate-500 text-[11px]">Qty: {item.quantity}</p>
                </div>
                <div className="font-bold text-slate-900">
                  ৳{(item.sellingPrice * item.quantity).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {/* Calculation */}
          <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-900">
                ৳{subtotal.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>Shipping ({isInsideDhaka ? "Inside Dhaka" : "Outside Dhaka"})</span>
              <span className="font-semibold text-slate-900">
                ৳{shippingFee.toLocaleString()}
              </span>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-between text-sm">
              <span className="font-bold text-slate-900">Total Payable</span>
              <span className="font-black text-lg text-slate-900">
                ৳{totalAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl font-extrabold text-sm btn-store-primary flex items-center justify-center gap-2 shadow-sm hover:opacity-95 disabled:opacity-50 transition-opacity"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Securing Inventory & Placing Order...
              </>
            ) : (
              `Confirm Order — ৳${totalAmount.toLocaleString()}`
            )}
          </button>

          <p className="text-[11px] text-center text-slate-500 flex items-center justify-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            100% Safe & Secure Checkout Guarantee
          </p>
        </div>
      </div>
    </form>
  );
}

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
  Tag,
  Check,
  X,
} from "lucide-react";
import { useFunnelTracker } from "../../../hooks/useFunnelTracker";

import { Input, Label, NativeSelect, Textarea } from "@repo/ui";
import { API_BASE } from "../../../lib/api-base";
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

export function CheckoutFormClient({ storeSlug }: CheckoutFormClientProps) {
  const router = useRouter();
  const { items, getSubtotal, clearCart } = useCart();
  const { sessionId, attribution, trackCheckoutInitiated } = useFunnelTracker(storeSlug);
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

  // Coupon State
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string;
    code: string;
    discountType: string;
    discountValue: number;
  } | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMessage, setCouponMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    trackCheckoutInitiated();
  }, [trackCheckoutInitiated]);

  const handleDistrictChange = (dist: string) => {
    setDistrict(dist);
    const inside = dist.toLowerCase() === "dhaka";
    setIsInsideDhaka(inside);
  };

  const handleApplyCoupon = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCouponMessage(null);
    const code = couponCodeInput.trim();
    if (!code) {
      setCouponMessage({ type: "error", text: "Please enter a coupon code." });
      return;
    }

    setCouponLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/stores/${storeSlug}/coupons/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal: getSubtotal() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to validate coupon");
      }

      setAppliedCoupon(data.coupon);
      setDiscountAmount(data.discountAmount);
      setCouponMessage({
        type: "success",
        text: `Coupon "${data.coupon.code}" applied! -৳${data.discountAmount.toLocaleString()}`,
      });
    } catch (err: any) {
      setAppliedCoupon(null);
      setDiscountAmount(0);
      setCouponMessage({ type: "error", text: err.message || "Invalid coupon code." });
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponCodeInput("");
    setCouponMessage(null);
  };

  if (!mounted) return null;

  const subtotal = getSubtotal();
  const shippingFee = isInsideDhaka ? 80 : 150;
  const payableSubtotal = Math.max(0, subtotal - discountAmount);
  const totalAmount = payableSubtotal + shippingFee;

  if (items.length === 0) {
    return (
      <div className="py-20 text-center space-y-4 bg-card rounded-3xl border border-border p-8">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto text-slate-400">
          <ShoppingBag className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Your Cart is Empty</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Please add products to your cart before proceeding to checkout.
          </p>
        </div>
        <Link
          href={`/${storeSlug}`}
          className="inline-flex px-6 py-3 rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
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
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        sessionId: sessionId || undefined,
        referralCode: attribution.ref || undefined,
        utmSource: attribution.utmSource || undefined,
        utmMedium: attribution.utmMedium || undefined,
        utmCampaign: attribution.utmCampaign || undefined,
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
        <div className="bg-card p-4 sm:p-6 rounded-2xl border border-border shadow-sm space-y-4">
          <h2 className="font-extrabold text-base text-foreground border-b border-slate-100 pb-3 flex items-center gap-2">
            <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-[11px] font-bold flex items-center justify-center shrink-0">
              1
            </span>
            Contact & Customer Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name *
              </Label>
              <Input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Karim Ullah"
                className="w-full text-xs"
              />
            </div>

            <div>
              <Label className="block text-xs font-bold text-slate-700 mb-1">
                Mobile Number *
              </Label>
              <Input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01811223344"
                className="w-full text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <Label className="block text-xs font-bold text-slate-700 mb-1">
              Email Address (Optional)
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="buyer@example.com"
              className="w-full text-xs"
            />
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-card p-4 sm:p-6 rounded-2xl border border-border shadow-sm space-y-4">
          <h2 className="font-extrabold text-base text-foreground border-b border-slate-100 pb-3 flex items-center gap-2">
            <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-[11px] font-bold flex items-center justify-center shrink-0">
              2
            </span>
            Delivery Address
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="block text-xs font-bold text-slate-700 mb-1">
                District / Region *
              </Label>
              <NativeSelect containerClassName="w-full"
                value={district}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="text-xs"
              >
                {BANGLADESH_DISTRICTS.map((dist) => (
                  <option key={dist} value={dist}>
                    {dist}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div>
              <Label className="block text-xs font-bold text-slate-700 mb-1">
                City / Area *
              </Label>
              <Input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Banani, Uttara, Mirpur"
                className="w-full text-xs"
              />
            </div>
          </div>

          <div>
            <Label className="block text-xs font-bold text-slate-700 mb-1">
              Full Street Address *
            </Label>
            <Textarea
              required
              rows={2}
              value={addressLine}
              onChange={(e) => setAddressLine(e.target.value)}
              placeholder="House #, Road #, Sector/Block, Landmark details"
              className="w-full text-xs"
            />
          </div>

          {/* Delivery Region Fee Notice */}
          <div className="p-3 rounded-xl bg-muted/50 border border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-600">
              Delivery zone: <strong>{isInsideDhaka ? "Inside Dhaka (৳80)" : "Outside Dhaka (৳150)"}</strong>
            </span>
            <button
              type="button"
              onClick={() => setIsInsideDhaka(!isInsideDhaka)}
              className="text-primary font-bold hover:underline shrink-0"
            >
              Toggle zone
            </button>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-card p-4 sm:p-6 rounded-2xl border border-border shadow-sm space-y-4">
          <h2 className="font-extrabold text-base text-foreground border-b border-slate-100 pb-3 flex items-center gap-2">
            <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-[11px] font-bold flex items-center justify-center">
              3
            </span>
            Payment Method
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* COD */}
            <Label
              className={`p-4 rounded-xl border-2 cursor-pointer flex flex-col justify-between transition-all ${
                paymentMethod === "COD"
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border hover:border-input"
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
                  <CheckCircle className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className="mt-3">
                <p className="font-bold text-xs text-foreground">Cash on Delivery</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Pay in cash at doorstep</p>
              </div>
            </Label>

            {/* bKash */}
            <Label
              className={`p-4 rounded-xl border-2 cursor-pointer flex flex-col justify-between transition-all ${
                paymentMethod === "BKASH"
                  ? "border-sky-600 bg-sky-50 shadow-sm"
                  : "border-border hover:border-input"
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
                <span className="font-black text-sky-600 text-sm">bKash</span>
                {paymentMethod === "BKASH" && (
                  <CheckCircle className="h-4 w-4 text-sky-600" />
                )}
              </div>
              <div className="mt-3">
                <p className="font-bold text-xs text-foreground">bKash Gateway</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Instant online payment</p>
              </div>
            </Label>

            {/* Nagad */}
            <Label
              className={`p-4 rounded-xl border-2 cursor-pointer flex flex-col justify-between transition-all ${
                paymentMethod === "NAGAD"
                  ? "border-orange-600 bg-orange-50 shadow-sm"
                  : "border-border hover:border-input"
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
                <p className="font-bold text-xs text-foreground">Nagad MFS</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Mobile wallet payment</p>
              </div>
            </Label>
          </div>
        </div>
      </div>

      {/* Right Column: Order Summary (5 cols) */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-card p-4 sm:p-6 rounded-2xl border border-border shadow-sm space-y-4 sticky top-24">
          <h2 className="font-extrabold text-base text-foreground border-b border-slate-100 pb-3">
            Order Summary ({items.length} items)
          </h2>

          {/* Items Preview */}
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {items.map((item) => (
              <div
                key={item.storeProductId}
                className="flex items-center gap-3 text-xs"
              >
                <div className="h-10 w-10 rounded-lg bg-muted border border-border overflow-hidden flex-shrink-0 flex items-center justify-center">
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
                  <p className="font-semibold text-foreground truncate">
                    {item.title}
                  </p>
                  <p className="text-muted-foreground text-[11px]">Qty: {item.quantity}</p>
                </div>
                <div className="font-bold text-foreground shrink-0">
                  ৳{(item.sellingPrice * item.quantity).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {/* Coupon Code Section */}
          <div className="pt-4 border-t border-slate-100">
            {appliedCoupon ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-extrabold text-emerald-800">
                      {appliedCoupon.code}
                    </span>
                    <span className="text-emerald-700 ml-1.5 text-[11px]">
                      ({appliedCoupon.discountType === "PERCENTAGE" ? `${appliedCoupon.discountValue}% off` : `৳${appliedCoupon.discountValue} off`})
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="text-emerald-700 hover:text-destructive transition-colors p-1 shrink-0"
                  title="Remove coupon"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="block text-xs font-bold text-slate-700">
                  Promo / Discount Code
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={couponCodeInput}
                    onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                    placeholder="Promo code (e.g. SAVE10)"
                    className="flex-1 text-xs font-mono uppercase min-w-0"
                  />
                  <button
                    type="button"
                    disabled={couponLoading || !couponCodeInput.trim()}
                    onClick={() => handleApplyCoupon()}
                    className="px-3 sm:px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition-opacity flex items-center gap-1.5 shrink-0"
                  >
                    {couponLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Apply"
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Coupon feedback message */}
            {couponMessage && (
              <div
                className={`mt-2 text-xs p-2.5 rounded-lg flex items-center gap-1.5 ${
                  couponMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-destructive/5 text-destructive border border-destructive/20"
                }`}
              >
                {couponMessage.type === "success" ? (
                  <Check className="h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 text-red-500" />
                )}
                <span>{couponMessage.text}</span>
              </div>
            )}
          </div>

          {/* Calculation */}
          <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-semibold text-foreground">
                ৳{subtotal.toLocaleString()}
              </span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span className="flex items-center gap-1">
                  <Tag className="h-3 w-3 shrink-0" />
                  Coupon Discount
                </span>
                <span>-৳{discountAmount.toLocaleString()}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-600">
              <span>Shipping ({isInsideDhaka ? "Inside Dhaka" : "Outside Dhaka"})</span>
              <span className="font-semibold text-foreground">
                ৳{shippingFee.toLocaleString()}
              </span>
            </div>

            <div className="pt-3 border-t border-border flex justify-between text-sm">
              <span className="font-bold text-foreground">Total Payable</span>
              <span className="font-black text-lg text-foreground">
                ৳{totalAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-xl flex items-start gap-2 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 sm:py-4 px-4 rounded-xl font-extrabold text-xs sm:text-sm bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2 shadow-sm hover:opacity-95 disabled:opacity-50 transition-opacity"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                Securing Inventory & Placing Order...
              </>
            ) : (
              `Confirm Order — ৳${totalAmount.toLocaleString()}`
            )}
          </button>

          <p className="text-[11px] text-center text-muted-foreground flex items-center justify-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            100% Safe & Secure Checkout Guarantee
          </p>
        </div>
      </div>
    </form>
  );
}

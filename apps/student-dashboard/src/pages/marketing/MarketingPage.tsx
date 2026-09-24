import React, { useEffect, useState } from "react";
import {
  Tag,
  Megaphone,
  Link2,
  Plus,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Calendar,
  Percent,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import { apiClient, Coupon, StoreBanner } from "@repo/api-client";
import { Button } from "@repo/ui";

interface MarketingPageProps {
  token: string;
}

export const MarketingPage: React.FC<MarketingPageProps> = ({ token }) => {
  const [activeTab, setActiveTab] = useState<"coupons" | "banner" | "links">("coupons");

  // Coupons State
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(true);
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [createCouponLoading, setCreateCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  // New Coupon Form
  const [newCode, setNewCode] = useState("");
  const [newDiscountType, setNewDiscountType] = useState<"PERCENTAGE" | "FIXED_AMOUNT">("PERCENTAGE");
  const [newDiscountValue, setNewDiscountValue] = useState<number>(10);
  const [newMinSpend, setNewMinSpend] = useState<number>(500);
  const [newMaxUses, setNewMaxUses] = useState<string>("");
  const [newEndDate, setNewEndDate] = useState<string>("");

  // Banner State
  const [banner, setBanner] = useState<StoreBanner>({
    bannerText: "",
    bannerLink: "",
    bannerBgColor: "#2563eb",
    bannerActive: false,
  });
  const [bannerLoading, setBannerLoading] = useState(false);
  const [bannerSavedMessage, setBannerSavedMessage] = useState<string | null>(null);

  // Referral Link Generator State
  const [userProfile, setUserProfile] = useState<any>(null);
  const [storeSlug, setStoreSlug] = useState<string>("");
  const [targetPath, setTargetPath] = useState<string>("");
  const [utmSource, setUtmSource] = useState<string>("facebook");
  const [utmCampaign, setUtmCampaign] = useState<string>("special_promo");
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    // Load student profile & store info
    apiClient.auth
      .getProfile(token)
      .then((profile) => {
        setUserProfile(profile);
        if (profile.stores && profile.stores.length > 0) {
          const store = profile.stores[0];
          setStoreSlug(store.slug);
          if (store.bannerText || store.bannerBgColor || store.bannerActive !== undefined) {
            setBanner({
              bannerText: store.bannerText || "",
              bannerLink: store.bannerLink || "",
              bannerBgColor: store.bannerBgColor || "#2563eb",
              bannerActive: store.bannerActive || false,
            });
          }
        }
      })
      .catch(console.error);

    loadCoupons();
  }, [token]);

  const loadCoupons = () => {
    setCouponsLoading(true);
    apiClient.marketing
      .listCoupons(token)
      .then((data) => {
        setCoupons(data);
        setCouponError(null);
      })
      .catch((err) => {
        setCouponError(err.message || "Failed to load coupons");
      })
      .finally(() => setCouponsLoading(false));
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);

    if (!newCode.trim()) {
      setCouponError("Coupon code is required");
      return;
    }

    setCreateCouponLoading(true);
    try {
      await apiClient.marketing.createCoupon(
        {
          code: newCode.trim().toUpperCase(),
          discountType: newDiscountType,
          discountValue: Number(newDiscountValue),
          minSpend: Number(newMinSpend) || 0,
          maxUses: newMaxUses ? Number(newMaxUses) : undefined,
          endDate: newEndDate ? new Date(newEndDate).toISOString() : undefined,
        },
        token,
      );

      setCouponModalOpen(false);
      setNewCode("");
      setNewDiscountValue(10);
      setNewMinSpend(500);
      setNewMaxUses("");
      setNewEndDate("");
      loadCoupons();
    } catch (err: any) {
      setCouponError(err.message || "Failed to create coupon");
    } finally {
      setCreateCouponLoading(false);
    }
  };

  const handleToggleCoupon = async (id: string, currentActive: boolean) => {
    try {
      await apiClient.marketing.updateCoupon(id, { isActive: !currentActive }, token);
      loadCoupons();
    } catch (err: any) {
      alert(err.message || "Failed to update coupon status");
    }
  };

  const handleSaveBanner = async () => {
    setBannerLoading(true);
    setBannerSavedMessage(null);
    try {
      const updated = await apiClient.marketing.updateBanner(banner, token);
      setBanner(updated);
      setBannerSavedMessage("Announcement banner updated successfully!");
    } catch (err: any) {
      alert(err.message || "Failed to save banner");
    } finally {
      setBannerLoading(false);
    }
  };

  // Generate Tracked URL
  const baseUrl = `http://localhost:3000/${storeSlug || "apex-gadgets"}`;
  const cleanPath = targetPath.startsWith("/") ? targetPath : targetPath ? `/${targetPath}` : "";
  const refCode = userProfile?.phone || userProfile?.fullName?.split(" ")[0]?.toLowerCase() || "reseller";
  const trackedUrl = `${baseUrl}${cleanPath}?ref=${refCode}&utm_source=${utmSource}&utm_campaign=${utmCampaign}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(trackedUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <Megaphone className="h-7 w-7 text-blue-600" />
          Marketing & Promotion Suite
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Launch promotional campaigns, create student discount coupons, configure storefront announcement bars, and track customer referrals.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("coupons")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === "coupons"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Tag className="h-4 w-4" />
          Discount Coupons ({coupons.length})
        </button>

        <button
          onClick={() => setActiveTab("banner")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === "banner"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Megaphone className="h-4 w-4" />
          Announcement Bar
        </button>

        <button
          onClick={() => setActiveTab("links")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === "links"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Link2 className="h-4 w-4" />
          Referral & Campaign Links
        </button>
      </div>

      {/* TAB 1: COUPONS */}
      {activeTab === "coupons" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Active Coupons</h3>
              <p className="text-xs text-slate-500">
                Coupons created here can be applied by customers on your storefront checkout.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setCouponModalOpen(true)}
              className="btn-store-primary text-xs font-bold gap-1.5 rounded-xl shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Create Coupon
            </Button>
          </div>

          {couponError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{couponError}</span>
            </div>
          )}

          {couponsLoading ? (
            <div className="py-16 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              Loading coupons...
            </div>
          ) : coupons.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Tag className="h-8 w-8" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">No Coupons Created Yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Create your first promo code (e.g. 10% off for new customers) to stimulate initial sales and complete your marketing challenge!
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setCouponModalOpen(true)}
                className="btn-store-primary text-xs font-bold gap-1.5 rounded-xl"
              >
                <Plus className="h-4 w-4" />
                Create First Coupon
              </Button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">Code</th>
                      <th className="px-6 py-3.5">Discount</th>
                      <th className="px-6 py-3.5">Min. Spend</th>
                      <th className="px-6 py-3.5">Usage Count</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {coupons.map((cpn) => (
                      <tr key={cpn.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-slate-900 flex items-center gap-2">
                          <Tag className="h-3.5 w-3.5 text-blue-600" />
                          {cpn.code}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-700">
                          {cpn.discountType === "PERCENTAGE"
                            ? `${cpn.discountValue}% OFF`
                            : `৳${Number(cpn.discountValue).toLocaleString()} OFF`}
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {Number(cpn.minSpend) > 0
                            ? `৳${Number(cpn.minSpend).toLocaleString()}`
                            : "No minimum"}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          <span className="font-bold text-slate-900">{cpn.usedCount}</span>
                          {cpn.maxUses ? ` / ${cpn.maxUses}` : " (Unlimited)"}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              cpn.isActive
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {cpn.isActive ? "ACTIVE" : "PAUSED"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleToggleCoupon(cpn.id, cpn.isActive)}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            {cpn.isActive ? "Pause" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ANNOUNCEMENT BAR */}
      {activeTab === "banner" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Announcement Bar Settings</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Displays a prominent sticky message at the top of your public storefront.
              </p>
            </div>

            {bannerSavedMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>{bannerSavedMessage}</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <p className="font-extrabold text-slate-900">Enable Announcement Bar</p>
                  <p className="text-[11px] text-slate-500">Show or hide the banner on your store</p>
                </div>
                <button
                  type="button"
                  onClick={() => setBanner({ ...banner, bannerActive: !banner.bannerActive })}
                  className="text-slate-700 hover:text-blue-600 transition-colors"
                >
                  {banner.bannerActive ? (
                    <ToggleRight className="h-8 w-8 text-blue-600" />
                  ) : (
                    <ToggleLeft className="h-8 w-8 text-slate-400" />
                  )}
                </button>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Announcement Message
                </label>
                <input
                  type="text"
                  value={banner.bannerText || ""}
                  onChange={(e) => setBanner({ ...banner, bannerText: e.target.value })}
                  placeholder="e.g. Free shipping on all orders over ৳1,000! Use code FLASH10"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Destination Link (Optional)
                </label>
                <input
                  type="text"
                  value={banner.bannerLink || ""}
                  onChange={(e) => setBanner({ ...banner, bannerLink: e.target.value })}
                  placeholder="e.g. /apex-gadgets/product/headphones-id"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-2">
                  Banner Background Color
                </label>
                <div className="flex items-center gap-3">
                  {["#2563eb", "#059669", "#d97706", "#7c3aed", "#0f172a", "#dc2626"].map(
                    (color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setBanner({ ...banner, bannerBgColor: color })}
                        style={{ backgroundColor: color }}
                        className={`h-7 w-7 rounded-full border-2 transition-transform ${
                          banner.bannerBgColor === color
                            ? "border-white ring-2 ring-slate-900 scale-110"
                            : "border-transparent hover:scale-105"
                        }`}
                      />
                    ),
                  )}
                  <input
                    type="text"
                    value={banner.bannerBgColor || "#2563eb"}
                    onChange={(e) => setBanner({ ...banner, bannerBgColor: e.target.value })}
                    className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono text-[11px]"
                  />
                </div>
              </div>

              <Button
                disabled={bannerLoading}
                onClick={handleSaveBanner}
                className="btn-store-primary w-full py-2.5 rounded-xl text-xs font-bold gap-2"
              >
                {bannerLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Save Announcement Settings
              </Button>
            </div>
          </div>

          {/* Live Preview */}
          <div className="lg:col-span-5 space-y-4">
            <h4 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">
              Live Preview
            </h4>
            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-slate-100 p-2">
              <div
                style={{ backgroundColor: banner.bannerBgColor || "#2563eb" }}
                className="text-white text-xs font-semibold px-4 py-2 text-center flex items-center justify-center gap-2 rounded-xl transition-all shadow-xs"
              >
                <Sparkles className="h-3.5 w-3.5 flex-shrink-0 animate-pulse" />
                <span>{banner.bannerText || "Your Announcement Message Preview Goes Here"}</span>
                {banner.bannerLink && <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 opacity-80" />}
              </div>

              <div className="h-32 bg-white rounded-xl mt-2 flex items-center justify-center text-slate-400 text-xs">
                Storefront Header Area Preview
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: REFERRAL & CAMPAIGN LINKS */}
      {activeTab === "links" && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900">
              Tracked Campaign & Referral Link Generator
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Share trackable links on social media and WhatsApp. The platform tracks visitor drop-offs and completed orders associated with each campaign link.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Target Page Path (Optional)
              </label>
              <input
                type="text"
                value={targetPath}
                onChange={(e) => setTargetPath(e.target.value)}
                placeholder="e.g. /product/headphones"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Marketing Channel (UTM Source)
              </label>
              <select
                value={utmSource}
                onChange={(e) => setUtmSource(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white"
              >
                <option value="facebook">Facebook</option>
                <option value="whatsapp">WhatsApp Group / DM</option>
                <option value="instagram">Instagram Bio / Story</option>
                <option value="tiktok">TikTok</option>
                <option value="youtube">YouTube</option>
                <option value="direct">Direct Referral</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Campaign Name (UTM Campaign)
              </label>
              <input
                type="text"
                value={utmCampaign}
                onChange={(e) => setUtmCampaign(e.target.value)}
                placeholder="e.g. eid_mega_sale"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>
          </div>

          {/* Generated URL Box */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Your Tracked Shareable Link:
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={trackedUrl}
                className="flex-1 bg-white px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none"
              />
              <Button
                size="sm"
                onClick={handleCopyLink}
                className="btn-store-primary text-xs font-bold gap-1.5 rounded-xl flex-shrink-0"
              >
                {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedLink ? "Copied!" : "Copy Link"}
              </Button>
            </div>
            <p className="text-[11px] text-slate-500">
              Attribution tag: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">ref={refCode}</code>
            </p>
          </div>
        </div>
      )}

      {/* CREATE COUPON MODAL */}
      {couponModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <Tag className="h-5 w-5 text-blue-600" />
                Create Store Coupon
              </h3>
              <button
                onClick={() => setCouponModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Coupon Code *
                </label>
                <input
                  type="text"
                  required
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  placeholder="e.g. FLASH20"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Discount Type
                  </label>
                  <select
                    value={newDiscountType}
                    onChange={(e) => setNewDiscountType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED_AMOUNT">Fixed Amount (৳)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={newDiscountType === "PERCENTAGE" ? 100 : undefined}
                    value={newDiscountValue}
                    onChange={(e) => setNewDiscountValue(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Minimum Cart Spend (৳)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newMinSpend}
                    onChange={(e) => setNewMinSpend(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Max Redemptions Limit
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newMaxUses}
                    onChange={(e) => setNewMaxUses(e.target.value)}
                    placeholder="Unlimited"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Expiration Date (Optional)
                </label>
                <input
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCouponModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createCouponLoading}
                  className="btn-store-primary flex-1 py-2.5 rounded-xl text-xs font-bold gap-1.5"
                >
                  {createCouponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Coupon"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

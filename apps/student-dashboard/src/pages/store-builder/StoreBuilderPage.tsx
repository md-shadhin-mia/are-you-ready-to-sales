import React, { useState, useEffect } from "react";
import { apiClient, Store } from "@repo/api-client";
import {
  Store as StoreIcon,
  Palette,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Sparkles,
  Eye,
} from "lucide-react";
import { Button } from "@repo/ui";

interface StoreBuilderPageProps {
  token: string;
}

const PRESET_COLORS = [
  { name: "Ocean Blue", value: "#2563eb" },
  { name: "Emerald Green", value: "#059669" },
  { name: "Royal Purple", value: "#7c3aed" },
  { name: "Sunset Orange", value: "#ea580c" },
  { name: "Crimson Rose", value: "#e11d48" },
  { name: "Midnight Slate", value: "#1e293b" },
];

export const StoreBuilderPage: React.FC<StoreBuilderPageProps> = ({ token }) => {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusToggling, setStatusToggling] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Form states
  const [storeName, setStoreName] = useState("");
  const [tagline, setTagline] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [secondaryColor, setSecondaryColor] = useState("#475569");
  const [borderRadius, setBorderRadius] = useState("0.75rem");

  useEffect(() => {
    loadStore();
  }, [token]);

  const loadStore = async () => {
    try {
      setLoading(true);
      const data = await apiClient.stores.getMyStore(token);
      setStore(data);
      setStoreName(data.storeName);
      setLogoUrl(data.logoUrl || "");
      setFaviconUrl(data.faviconUrl || "");
      setTagline(data.brandingInfo?.tagline || "");
      setContactEmail(data.brandingInfo?.contactEmail || "");
      setContactPhone(data.brandingInfo?.contactPhone || "");
      setPrimaryColor(data.themeConfig?.primaryColor || "#2563eb");
      setSecondaryColor(data.themeConfig?.secondaryColor || "#475569");
      setBorderRadius(data.themeConfig?.borderRadius || "0.75rem");
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to load store", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const updated = await apiClient.stores.updateBranding(
        {
          storeName,
          logoUrl: logoUrl || undefined,
          faviconUrl: faviconUrl || undefined,
          brandingInfo: {
            tagline,
            contactEmail,
            contactPhone,
          },
        },
        token,
      );
      setStore(updated);
      setMessage({ text: "Store branding saved successfully!", type: "success" });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to save branding", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTheme = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const updated = await apiClient.stores.updateTheme(
        {
          primaryColor,
          secondaryColor,
          borderRadius,
        },
        token,
      );
      setStore(updated);
      setMessage({ text: "Storefront theme updated!", type: "success" });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to save theme", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!store) return;
    setStatusToggling(true);
    setMessage(null);

    const newStatus = store.status === "ACTIVE" ? "DRAFT" : "ACTIVE";

    try {
      const updated = await apiClient.stores.updateStatus(newStatus, token);
      setStore(updated);
      setMessage({
        text: `Store is now ${newStatus === "ACTIVE" ? "Live to the public!" : "set to Draft mode"}`,
        type: "success",
      });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to toggle status", type: "error" });
    } finally {
      setStatusToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        Loading store builder...
      </div>
    );
  }

  if (!store) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center">
        <p className="text-sm font-semibold text-slate-700">No store found for your account.</p>
      </div>
    );
  }

  const storefrontUrl = `http://localhost:3000/${store.slug}`;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Banner: Status & Live Preview Link */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="h-12 w-12 rounded-2xl flex items-center justify-center text-white font-extrabold shadow-sm"
            style={{ backgroundColor: primaryColor }}
          >
            {store.storeName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900">{store.storeName}</h2>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  store.status === "ACTIVE"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-amber-100 text-amber-800 border border-amber-200"
                }`}
              >
                {store.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{store.slug}.platform.local</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={storefrontUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 border border-slate-300 hover:bg-slate-50 transition-colors"
          >
            <Eye className="h-4 w-4" />
            Visit Storefront
            <ExternalLink className="h-3 w-3 text-slate-400" />
          </a>

          <Button
            size="sm"
            onClick={handleToggleStatus}
            disabled={statusToggling}
            className={`text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-colors ${
              store.status === "ACTIVE"
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            {statusToggling ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : store.status === "ACTIVE" ? (
              "Switch to Draft"
            ) : (
              "Publish Store"
            )}
          </Button>
        </div>
      </div>

      {/* Alert Notification */}
      {message && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-2 text-xs font-medium ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Grid: Branding on Left, Theme on Right */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Branding Form */}
        <form
          onSubmit={handleSaveBranding}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <StoreIcon className="h-5 w-5 text-blue-600" />
            <h3 className="font-extrabold text-sm text-slate-900">Store Branding</h3>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Store Name</label>
            <input
              type="text"
              required
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tagline</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. Premium Gadgets & Accessories at Student Wholesale Prices"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Logo URL</label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Favicon URL</label>
            <input
              type="url"
              value={faviconUrl}
              onChange={(e) => setFaviconUrl(e.target.value)}
              placeholder="https://..."
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Support Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="store@domain.com"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Support Phone</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="01700000000"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Branding"}
          </Button>
        </form>

        {/* Theme Customizer */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Palette className="h-5 w-5 text-indigo-600" />
            <h3 className="font-extrabold text-sm text-slate-900">Theme & Visual Styling</h3>
          </div>

          {/* Primary Color Swatches */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Brand Primary Color
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setPrimaryColor(c.value)}
                  className={`p-2 rounded-xl border flex items-center gap-2 transition-all ${
                    primaryColor === c.value
                      ? "border-slate-900 ring-2 ring-slate-900/10 shadow-xs"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span
                    className="h-4 w-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: c.value }}
                  />
                  <span className="text-[11px] font-semibold text-slate-800 truncate">
                    {c.name}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-9 w-12 rounded-lg cursor-pointer border border-slate-300"
              />
              <span className="text-xs font-mono text-slate-600">{primaryColor}</span>
            </div>
          </div>

          {/* Border Radius */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Corner Roundness</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Subtle (6px)", value: "0.375rem" },
                { label: "Modern (12px)", value: "0.75rem" },
                { label: "Rounded (24px)", value: "1.5rem" },
              ].map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setBorderRadius(r.value)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    borderRadius === r.value
                      ? "border-slate-900 bg-slate-50 text-slate-900"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live Component Preview */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Live Button Preview
            </p>
            <button
              type="button"
              style={{
                backgroundColor: primaryColor,
                borderRadius: borderRadius,
              }}
              className="w-full py-3 text-white text-xs font-bold shadow-xs hover:opacity-90 transition-opacity"
            >
              Add to Cart — ৳1,500
            </button>
          </div>

          <Button
            type="button"
            onClick={handleSaveTheme}
            disabled={saving}
            className="w-full py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Theme Styling"}
          </Button>
        </div>
      </div>
    </div>
  );
};

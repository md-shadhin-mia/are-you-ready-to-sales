import { headers } from "next/headers";
import { Store, ShoppingBag, Sparkles, ShieldCheck } from "lucide-react";

export default function StorefrontHomePage() {
  const headersList = headers();
  const tenantSlug = headersList.get("x-tenant-slug") || "apex-gadgets";

  return (
    <main className="min-h-screen flex flex-col">
      {/* Announcement Bar */}
      <div className="bg-slate-900 text-white text-xs py-2 px-4 text-center font-medium">
        🎉 Grand Opening! Free Express Delivery on orders over ৳1,500 across Bangladesh.
      </div>

      {/* Store Header */}
      <header className="bg-white border-b border-slate-200 py-4 px-8 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm">
            {tenantSlug.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-900 capitalize leading-tight">
              {tenantSlug.replace(/-/g, " ")}
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              {tenantSlug}.platform.local
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Verified Student Reseller
          </span>
        </div>
      </header>

      {/* Hero Section */}
      <div className="flex-1 max-w-5xl mx-auto p-8 flex flex-col items-center justify-center text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium">
          <Sparkles className="h-3.5 w-3.5 text-blue-600" />
          Multi-Tenant Architecture Active
        </div>

        <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 max-w-2xl">
          Welcome to <span className="text-blue-600 capitalize">{tenantSlug.replace(/-/g, " ")}</span>
        </h2>

        <p className="text-slate-600 text-base max-w-xl leading-relaxed">
          This storefront is served through dynamic host-header tenant resolution.
          In Phase 2 (Core Commerce), this store will display customized reseller products, live cart drawer, checkout, and bKash / Nagad payment integration!
        </p>

        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-lg w-full text-left space-y-3">
          <div className="flex items-center gap-2 font-semibold text-sm text-slate-900">
            <Store className="h-4 w-4 text-blue-600" />
            Active Tenant Resolution Context
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-xs font-mono text-slate-700 space-y-1">
            <p><strong>Resolved Tenant:</strong> {tenantSlug}</p>
            <p><strong>Subdomain:</strong> {tenantSlug}.platform.local</p>
            <p><strong>Status:</strong> ACTIVE</p>
            <p><strong>Phase:</strong> Phase 1 Foundation Complete</p>
          </div>
        </div>
      </div>
    </main>
  );
}

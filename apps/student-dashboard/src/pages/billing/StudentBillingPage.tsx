import React, { useState, useEffect } from "react";
import {
  apiClient,
  SubscriptionPlan,
  StudentSubscription,
} from "@repo/api-client";
import {
  Check,
  Zap,
  Globe,
  Package,
  Percent,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Button } from "@repo/ui";

interface StudentBillingPageProps {
  token: string;
}

export const StudentBillingPage: React.FC<StudentBillingPageProps> = ({ token }) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<StudentSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradingPlan, setUpgradingPlan] = useState<SubscriptionPlan | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadBillingData();
  }, [token]);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      const [plansData, subData] = await Promise.all([
        apiClient.subscriptions.getPlans(),
        apiClient.subscriptions.getMySubscription(token),
      ]);
      setPlans(plansData || []);
      setSubscription(subData);
    } catch (err: any) {
      console.error("Failed to load billing data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!upgradingPlan) return;
    try {
      setUpgrading(true);
      setMsg(null);
      await apiClient.subscriptions.upgradeSubscription(upgradingPlan.code, token);
      setMsg({
        type: "success",
        text: `Successfully upgraded to the ${upgradingPlan.name} plan! Your new quota is immediately active.`,
      });
      setUpgradingPlan(null);
      loadBillingData();
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err?.message || "Failed to upgrade subscription tier",
      });
    } finally {
      setUpgrading(false);
    }
  };

  const currentPlanCode = subscription?.plan?.code || "FREE";
  const usage = subscription?.usage || {
    currentProductCount: 0,
    maxProducts: 10,
    allowCustomDomain: false,
    platformCommissionPercent: 10,
  };

  const productPercent = Math.min(
    100,
    Math.round((usage.currentProductCount / Math.max(1, usage.maxProducts)) * 100),
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Subscription Plans & Quota Limits
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Scale your commercial reseller store: higher product capacities, custom domains, and reduced sales commissions
          </p>
        </div>

        <button
          onClick={loadBillingData}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-xs"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-xl text-sm font-medium border flex items-center justify-between ${
            msg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          <span>{msg.text}</span>
          <button
            onClick={() => setMsg(null)}
            className="text-xs underline ml-4 hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Active Subscription & Quota Usage Card */}
      {subscription && (
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Zap className="h-48 w-48 text-blue-400" />
          </div>

          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs uppercase font-bold tracking-widest text-indigo-400">
                    Current Active Tier
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {subscription.subscription?.status || "ACTIVE"}
                  </span>
                </div>
                <h2 className="text-3xl font-extrabold text-white">
                  {subscription.plan?.name || "Free Tier"}
                </h2>
                {subscription.subscription?.currentPeriodEnd && (
                  <p className="text-xs text-slate-300 mt-1">
                    Active billing period expires:{" "}
                    {new Date(subscription.subscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">
                  ৳{subscription.plan?.monthlyPrice || 0}
                </span>
                <span className="text-xs text-slate-400">/ month</span>
              </div>
            </div>

            {/* Quota Usage Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
              {/* Product Quota */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Package className="h-3.5 w-3.5 text-blue-400" /> Catalog Quota
                  </span>
                  <span className="font-mono font-bold text-white">
                    {usage.currentProductCount} / {usage.maxProducts}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${productPercent}%` }}
                    className={`h-full rounded-full transition-all ${
                      productPercent >= 90
                        ? "bg-red-500"
                        : productPercent >= 70
                          ? "bg-amber-400"
                          : "bg-blue-500"
                    }`}
                  ></div>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  {usage.maxProducts - usage.currentProductCount > 0
                    ? `${usage.maxProducts - usage.currentProductCount} products remaining`
                    : "Quota reached! Upgrade to import more products."}
                </p>
              </div>

              {/* Custom Domain Binding */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Globe className="h-3.5 w-3.5 text-purple-400" /> Custom Domain
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        usage.allowCustomDomain
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-white/10 text-slate-400"
                      }`}
                    >
                      {usage.allowCustomDomain ? "Unlocked" : "Locked"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium mt-2">
                    {usage.allowCustomDomain
                      ? "Eligible to connect your custom branded domain"
                      : "Requires Starter tier or higher"}
                  </p>
                </div>
              </div>

              {/* Platform Commission Rate */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Percent className="h-3.5 w-3.5 text-emerald-400" /> Commission Rate
                    </span>
                    <span className="text-sm font-bold text-emerald-400 font-mono">
                      {subscription.plan?.platformCommissionPercent}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium mt-2">
                    Institute wholesale commission retained per order
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Matrix */}
      <div>
        <div className="text-center max-w-xl mx-auto mb-10">
          <h2 className="text-xl font-bold text-slate-900">Select a Subscription Tier</h2>
          <p className="text-xs text-slate-500 mt-1">
            Upgrade anytime with immediate activation. No long-term contracts required.
          </p>
        </div>

        {loading ? (
          <div className="p-16 text-center text-slate-400">Loading subscription tiers...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => {
              const isCurrent = currentPlanCode === plan.code;
              const isPopular = plan.code === "PRO";

              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-2xl border transition-all flex flex-col justify-between relative shadow-xs ${
                    isCurrent
                      ? "border-emerald-500 ring-2 ring-emerald-500/20"
                      : isPopular
                        ? "border-blue-500 shadow-md"
                        : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold tracking-wider uppercase shadow-xs">
                      Most Popular
                    </div>
                  )}

                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-slate-900 text-lg">{plan.name}</h3>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                          Active Plan
                        </span>
                      )}
                    </div>

                    <div className="mt-4 mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-slate-900">
                          ৳{plan.monthlyPrice.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-500">/ month</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {plan.monthlyPrice === 0
                          ? "Free forever for all students"
                          : `৳${plan.yearlyPrice.toLocaleString()} billed annually`}
                      </p>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-slate-100 text-xs text-slate-600">
                      <div className="flex items-center gap-2.5">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>
                          <strong>{plan.maxProducts}</strong> Imported Products
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        {plan.allowCustomDomain ? (
                          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                        ) : (
                          <div className="h-4 w-4 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] shrink-0">
                            ✕
                          </div>
                        )}
                        <span className={plan.allowCustomDomain ? "" : "text-slate-400 line-through"}>
                          Custom Domain Binding
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>
                          <strong>{plan.platformCommissionPercent}%</strong> Platform Commission
                        </span>
                      </div>

                      {(plan.features || []).map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2.5">
                          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-6 pt-0">
                    {isCurrent ? (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-xl bg-emerald-50 text-emerald-700 font-semibold text-xs border border-emerald-200 cursor-default"
                      >
                        Current Tier
                      </button>
                    ) : (
                      <button
                        onClick={() => setUpgradingPlan(plan)}
                        className={`w-full py-2.5 rounded-xl font-semibold text-xs transition-colors shadow-xs ${
                          isPopular
                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                            : "bg-slate-900 hover:bg-slate-800 text-white"
                        }`}
                      >
                        Upgrade to {plan.name}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upgrade Confirmation Modal */}
      {upgradingPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  Upgrade to {upgradingPlan.name} Plan
                </h3>
                <p className="text-xs text-slate-500">
                  Instant quota unlock & enhanced reseller privileges
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Monthly Plan Fee:</span>
                <span className="font-bold text-slate-900">৳{upgradingPlan.monthlyPrice}/mo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">New Product Import Limit:</span>
                <span className="font-bold text-blue-600">{upgradingPlan.maxProducts} Products</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Custom Domain Support:</span>
                <span className="font-semibold text-slate-800">
                  {upgradingPlan.allowCustomDomain ? "Supported" : "Not included"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Platform Commission:</span>
                <span className="font-semibold text-emerald-600">
                  {upgradingPlan.platformCommissionPercent}% per sale
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              By confirming, your student store will immediately be upgraded. Higher import limits and custom domain settings will take effect instantly.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUpgradingPlan(null)}
                disabled={upgrading}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={upgrading}
                className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm"
              >
                {upgrading ? "Upgrading..." : "Confirm Upgrade"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

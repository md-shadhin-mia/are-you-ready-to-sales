import React, { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  Eye,
  ShoppingCart,
  CreditCard,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  Loader2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { apiClient, FunnelMetrics } from "@repo/api-client";
import { Button } from "@repo/ui";
import { StudentDashboardTab } from "../../components/StudentLayout";

interface AnalyticsPageProps {
  token: string;
  setActiveTab?: (tab: StudentDashboardTab) => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ token, setActiveTab }) => {
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");
  const [metrics, setMetrics] = useState<FunnelMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiClient.analytics
      .getFunnel(range, token)
      .then((data) => {
        setMetrics(data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || "Failed to load funnel analytics");
      })
      .finally(() => setLoading(false));
  }, [range, token]);

  const handleCoachAction = (actionType: string) => {
    if (!setActiveTab) return;
    if (actionType === "CREATE_COUPON" || actionType === "REFERRAL_CAMPAIGN" || actionType === "SHARE_STORE") {
      setActiveTab("marketing" as any);
    } else if (actionType === "OPTIMIZE_PRODUCTS" || actionType === "REVIEW_PRICING") {
      setActiveTab("my-products");
    } else if (actionType === "ADD_PRODUCTS") {
      setActiveTab("marketplace");
    }
  };

  if (loading && !metrics) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-xs font-semibold">Analyzing Store Funnel & Diagnostic Rules...</p>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs flex items-center gap-3">
        <AlertCircle className="h-5 w-5 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (!metrics) return null;

  const funnelSteps = [
    {
      label: "Visitors",
      count: metrics.visitors,
      icon: Users,
      color: "bg-blue-600",
      dropOff: null,
    },
    {
      label: "Product Views",
      count: metrics.productViews,
      icon: Eye,
      color: "bg-indigo-600",
      dropOff: `${metrics.stageDropOffs.visitorToViewDropOff}% drop-off`,
    },
    {
      label: "Add to Cart",
      count: metrics.addToCarts,
      icon: ShoppingCart,
      color: "bg-amber-600",
      dropOff: `${metrics.stageDropOffs.viewToCartDropOff}% drop-off`,
    },
    {
      label: "Checkout Initiated",
      count: metrics.checkoutsInitiated,
      icon: CreditCard,
      color: "bg-purple-600",
      dropOff: `${metrics.stageDropOffs.cartToCheckoutDropOff}% drop-off`,
    },
    {
      label: "Completed Orders",
      count: metrics.completedOrders,
      icon: CheckCircle,
      color: "bg-emerald-600",
      dropOff: `${metrics.stageDropOffs.checkoutToOrderDropOff}% drop-off`,
    },
  ];

  const maxCount = Math.max(...funnelSteps.map((s) => s.count), 1);

  return (
    <div className="space-y-8">
      {/* Header & Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="h-7 w-7 text-blue-600" />
            Conversion Funnel & Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track visitor journey stages from initial landing to final order delivery and inspect automated coaching advice.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-2xl shadow-xs">
          {(["7d", "30d", "90d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                range === r
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {r === "7d" ? "Last 7 Days" : r === "30d" ? "Last 30 Days" : "Last 90 Days"}
            </button>
          ))}
        </div>
      </div>

      {/* SMART BUSINESS COACH CARD */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden border border-blue-800">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center flex-shrink-0 shadow-md">
            <Lightbulb className="h-6 w-6" />
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Automated Coaching Diagnosis
              </span>
              <span className="text-xs text-slate-400">
                Priority:{" "}
                <span
                  className={
                    metrics.coachingAdvice.priority === "HIGH"
                      ? "text-red-400 font-bold"
                      : "text-emerald-400 font-bold"
                  }
                >
                  {metrics.coachingAdvice.priority}
                </span>
              </span>
            </div>

            <h3 className="text-lg font-black">{metrics.coachingAdvice.diagnosis}</h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              {metrics.coachingAdvice.message}
            </p>

            <div className="pt-2">
              <button
                onClick={() => handleCoachAction(metrics.coachingAdvice.actionType)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-950 hover:bg-slate-100 transition-colors shadow-sm"
              >
                <span>{metrics.coachingAdvice.actionLabel}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
            Overall Conversion Rate
          </p>
          <p className="text-2xl font-black text-slate-900">
            {metrics.conversionRatePercent}%
          </p>
          <p className="text-[11px] text-slate-400">Visitors to completed orders</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
            Average Order Value (AOV)
          </p>
          <p className="text-2xl font-black text-blue-600">
            ৳{metrics.averageOrderValue.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400">Per completed order</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
            Cart Abandonment
          </p>
          <p className="text-2xl font-black text-amber-600">
            {metrics.cartAbandonmentPercent}%
          </p>
          <p className="text-[11px] text-slate-400">Carts without checkouts</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
            Completed Orders
          </p>
          <p className="text-2xl font-black text-emerald-600">
            {metrics.completedOrders}
          </p>
          <p className="text-[11px] text-slate-400">In selected period</p>
        </div>
      </div>

      {/* VISUAL FUNNEL CHART */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
        <div>
          <h3 className="font-extrabold text-sm text-slate-900">
            E-Commerce Conversion Funnel Stages
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Identify exactly where potential buyers drop out along your sales journey.
          </p>
        </div>

        <div className="space-y-4">
          {funnelSteps.map((step, idx) => {
            const widthPercent = Math.max(8, Math.round((step.count / maxCount) * 100));

            return (
              <div key={step.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-2">
                    <step.icon className="h-4 w-4 text-slate-400" />
                    {step.label}
                  </span>
                  <div className="flex items-center gap-3">
                    {step.dropOff && (
                      <span className="text-[10px] font-semibold text-slate-400">
                        {step.dropOff}
                      </span>
                    )}
                    <span className="font-black text-slate-900 font-mono">
                      {step.count.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Funnel Bar */}
                <div className="h-7 w-full bg-slate-100 rounded-xl overflow-hidden p-1 flex items-center">
                  <div
                    style={{ width: `${widthPercent}%` }}
                    className={`h-full rounded-lg ${step.color} transition-all duration-500 flex items-center justify-end pr-2 text-[10px] font-bold text-white`}
                  >
                    {step.count > 0 && `${step.count}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

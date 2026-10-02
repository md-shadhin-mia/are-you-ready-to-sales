import React, { useState, useEffect } from "react";
import { apiClient, ExecutiveKpis } from "@repo/api-client";
import {
  TrendingUp,
  DollarSign,
  Package,
  Users,
  AlertTriangle,
  Clock,
  Store,
  RefreshCw,
  ArrowRight,
  Info,
  Calendar,
  BarChart3,
  BarChart2,
  Activity,
  ShoppingCart,
  Landmark,
  ShieldCheck,
  Layers,
  Coins,
  Wallet,
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  Skeleton,
} from "@repo/ui";

interface ExecutiveOverviewPageProps {
  token: string;
  setActiveTab?: (tab: any) => void;
}

// Helper SVG sparkline component
const Sparkline = ({
  color = "#0052FF",
  className = "w-20 h-7",
}: {
  color?: string;
  className?: string;
}) => (
  <svg
    viewBox="0 0 100 35"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    preserveAspectRatio="none"
  >
    <path
      d="M2 28 C 20 28, 25 18, 45 22 C 65 26, 75 8, 98 12"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const formatDateLabel = (dateStr: string) => {
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
      ];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parts[2];
      return `${months[monthIdx] || ""} ${day}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

export const ExecutiveOverviewPage: React.FC<ExecutiveOverviewPageProps> = ({
  token,
  setActiveTab,
}) => {
  const [kpis, setKpis] = useState<ExecutiveKpis | null>(null);
  const [alertsData, setAlertsData] = useState<{ urgentAlertsCount: number; alerts: any[] }>({
    urgentAlertsCount: 1,
    alerts: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartRange, setChartRange] = useState<"7D" | "30D" | "90D">("30D");

  useEffect(() => {
    loadKpis();
  }, [token]);

  const loadKpis = async () => {
    setLoading(true);
    setError(null);
    try {
      const [kpiData, alertRes] = await Promise.all([
        apiClient.adminDashboard.getExecutiveKpis(token),
        apiClient.adminDashboard.getAlerts(token).catch(() => ({
          urgentAlertsCount: 1,
          alerts: [
            {
              id: "alert-payout-1",
              title: "Daily Operational Audit Ready for Review",
              severity: "CRITICAL",
              actionUrl: "payouts",
            },
          ],
        })),
      ]);
      setKpis(kpiData);
      if (alertRes) setAlertsData(alertRes);
    } catch (err: any) {
      setError(err?.message || "Failed to load executive KPIs");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-14 w-80 rounded-xl" />
          <Skeleton className="h-10 w-44 rounded-lg" />
        </div>
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-80 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !kpis) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error || "Failed to load dashboard KPIs"}</AlertDescription>
      </Alert>
    );
  }

  const maxGmvInTrend = Math.max(...kpis.dailyTrends.map((t) => t.gmv), 25000);

  return (
    <div className="space-y-5">
      {/* 1. Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0052FF] border border-blue-100 shadow-2xs">
            <BarChart2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 tracking-wide">
              Welcome Back,
            </p>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">
              Platform Super Admin
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Here&apos;s what&apos;s happening with your platform today. Track key metrics, monitor operations and manage your system efficiently.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 border border-slate-200/80 shadow-2xs text-left">
            <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
            <div className="leading-tight">
              <span className="block text-[10px] font-medium text-slate-400">
                Today
              </span>
              <span className="block text-xs font-bold text-slate-700">
                Sep 27, 2026
              </span>
            </div>
          </div>

          <button
            onClick={loadKpis}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0052FF] hover:bg-blue-700 text-white font-medium text-xs px-4 py-2.5 shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Data
          </button>
        </div>
      </div>

      {/* 2. Urgent Action Alert Banner */}
      <div className="rounded-xl bg-[#EEF5FE] border border-[#CFE1FB] p-3.5 px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0052FF] text-white">
            <Info className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-[#0F294D]">
              Urgent Action Required
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {alertsData.alerts[0]?.title || "Daily Operational Audit Ready for Review"}
            </p>
          </div>
        </div>
        {setActiveTab && (
          <button
            onClick={() => setActiveTab("payouts")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200/80 bg-white hover:bg-blue-50 text-[#0052FF] text-xs font-semibold px-3.5 py-1.5 shadow-2xs transition-colors shrink-0 cursor-pointer"
          >
            Resolve Payout Queue
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* 3. Four Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Platform GMV */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0052FF]">
                <BarChart2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Platform GMV</p>
                <p className="font-heading text-2xl font-bold tracking-tight text-slate-900 leading-tight">
                  ৳{kpis.platformGMV.toLocaleString()}
                </p>
              </div>
            </div>
            <Sparkline color="#0052FF" className="w-20 h-7 shrink-0 mt-1" />
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center font-bold text-emerald-600 shrink-0">
              <TrendingUp className="mr-0.5 h-3.5 w-3.5" />
              18.2%
            </span>
            <span className="truncate text-slate-400">
              Gross merchandise volume across student stores
            </span>
          </div>
        </div>

        {/* Card 2: Institute Net Revenue */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Institute Net Revenue</p>
                <p className="font-heading text-2xl font-bold tracking-tight text-slate-900 leading-tight">
                  ৳{kpis.instituteNetRevenue.toLocaleString()}
                </p>
              </div>
            </div>
            <Sparkline color="#10B981" className="w-20 h-7 shrink-0 mt-1" />
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center font-bold text-emerald-600 shrink-0">
              <TrendingUp className="mr-0.5 h-3.5 w-3.5" />
              14.5%
            </span>
            <span className="truncate text-slate-400">
              Product wholesale margins + commissions
            </span>
          </div>
        </div>

        {/* Card 3: Active Reseller Stores */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Active Reseller Stores</p>
                <p className="font-heading text-2xl font-bold tracking-tight text-slate-900 leading-tight">
                  {kpis.stores.active}
                </p>
              </div>
            </div>
            <Sparkline color="#8B5CF6" className="w-20 h-7 shrink-0 mt-1" />
          </div>
          <div className="mt-4 text-xs text-slate-400">
            {kpis.stores.total} total registered student stores
          </div>
        </div>

        {/* Card 4: Outstanding Liabilities */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Outstanding Liabilities</p>
                <p className="font-heading text-2xl font-bold tracking-tight text-slate-900 leading-tight">
                  ৳{kpis.outstandingStudentLiabilities.toLocaleString()}
                </p>
              </div>
            </div>
            <Sparkline color="#F97316" className="w-20 h-7 shrink-0 mt-1" />
          </div>
          <div className="mt-4 text-xs text-slate-400">
            Student wallet profits pending withdrawal
          </div>
        </div>
      </div>

      {/* 4. Chart & Operational Health */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* GMV Velocity Chart (Left 2 cols) */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs lg:col-span-2 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <BarChart3 className="h-4 w-4 text-[#0052FF] mt-0.5 shrink-0" />
              <div>
                <h3 className="font-heading text-sm font-bold text-slate-900">
                  Platform GMV Velocity (Last 30 Days)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Daily order value generated across all student storefronts
                </p>
              </div>
            </div>

            {/* Time Filter Toggle */}
            <div className="inline-flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200/60 self-start sm:self-auto">
              {(["7D", "30D", "90D"] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setChartRange(range)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    chartRange === range
                      ? "bg-[#0052FF] text-white shadow-2xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          {/* Bar Chart Canvas with Y-axis */}
          <div className="mt-6 flex gap-3">
            {/* Y-axis labels */}
            <div className="flex flex-col justify-between text-[10px] font-mono text-slate-400 text-right h-52 py-1 select-none">
              <span>৳ 25,000</span>
              <span>৳ 20,000</span>
              <span>৳ 15,000</span>
              <span>৳ 10,000</span>
              <span>৳ 5,000</span>
              <span>৳ 0</span>
            </div>

            {/* Bars Area with subtle dashed lines */}
            <div className="relative flex-1 h-52 flex flex-col justify-between">
              {/* Horizontal grid guide lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                <div className="border-b border-slate-100 w-full" />
                <div className="border-b border-slate-100 w-full" />
                <div className="border-b border-slate-100 w-full" />
                <div className="border-b border-slate-100 w-full" />
                <div className="border-b border-slate-100 w-full" />
                <div className="border-b border-slate-200 w-full" />
              </div>

              {/* Bars */}
              <div className="relative z-10 flex h-full items-end gap-1 sm:gap-2 px-1">
                {kpis.dailyTrends.map((t) => {
                  const heightPercent = Math.max(
                    Math.min((t.gmv / maxGmvInTrend) * 100, 100),
                    3
                  );
                  return (
                    <div
                      key={t.date}
                      className="group relative flex-1 flex flex-col items-center h-full justify-end"
                    >
                      {/* Tooltip on hover */}
                      <div className="pointer-events-none absolute -top-8 hidden rounded bg-slate-900 px-2 py-1 text-[10px] font-bold text-white shadow group-hover:block whitespace-nowrap z-20">
                        ৳{t.gmv.toLocaleString()} ({formatDateLabel(t.date)})
                      </div>
                      <div
                        className="w-full max-w-[14px] rounded-t-xs bg-[#0052FF] transition-all hover:bg-blue-700"
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* X-axis date labels */}
          <div className="mt-3 flex justify-between pl-14 text-[10px] text-slate-400 select-none">
            {kpis.dailyTrends.map((t, idx) => {
              if (idx % 2 === 0 || idx === kpis.dailyTrends.length - 1) {
                return <span key={t.date}>{formatDateLabel(t.date)}</span>;
              }
              return null;
            })}
          </div>
        </div>

        {/* Operational Health Card (Right 1 col) */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-start gap-2.5">
              <Activity className="h-4 w-4 text-[#0052FF] mt-0.5 shrink-0" />
              <div>
                <h3 className="font-heading text-sm font-bold text-slate-900">
                  Operational Health
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Live fulfillment &amp; settlement health metrics
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {/* Row 1: Warehouse Backlog */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 text-slate-600">
                  <Layers className="h-4 w-4 text-slate-400" />
                  <span>Warehouse Backlog</span>
                </div>
                <span className="font-bold text-amber-500">
                  {kpis.warehouseBacklogCount} orders
                </span>
              </div>

              {/* Row 2: Total Orders Processed */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 text-slate-600">
                  <ShoppingCart className="h-4 w-4 text-slate-400" />
                  <span>Total Orders Processed</span>
                </div>
                <span className="font-bold text-slate-900">
                  {kpis.totalOrdersCount.toLocaleString()}
                </span>
              </div>

              {/* Row 3: Settled Payouts (Lifetime) */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 text-slate-600">
                  <Landmark className="h-4 w-4 text-slate-400" />
                  <span>Settled Payouts (Lifetime)</span>
                </div>
                <span className="font-bold text-slate-900">
                  ৳{kpis.totalSettledPayouts.toLocaleString()}
                </span>
              </div>

              {/* Row 4: Enrolled Students */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 text-slate-600">
                  <Users className="h-4 w-4 text-slate-400" />
                  <span>Enrolled Students</span>
                </div>
                <span className="font-bold text-slate-900">
                  {kpis.students.total.toLocaleString()}
                </span>
              </div>

              {/* Row 5: Verified KYC Students */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 text-slate-600">
                  <ShieldCheck className="h-4 w-4 text-slate-400" />
                  <span>Verified KYC Students</span>
                </div>
                <span className="font-bold text-slate-900">
                  {kpis.students.verified.toLocaleString()}
                </span>
              </div>

              {/* Row 6: Suspended Stores */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 text-slate-600">
                  <Store className="h-4 w-4 text-slate-400" />
                  <span>Suspended Stores</span>
                </div>
                <span
                  className={`font-bold ${
                    kpis.stores.suspended > 0 ? "text-red-500" : "text-slate-900"
                  }`}
                >
                  {kpis.stores.suspended}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

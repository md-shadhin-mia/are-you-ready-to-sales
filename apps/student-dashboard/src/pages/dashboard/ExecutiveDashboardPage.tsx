import React, { useState, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Users,
  Star,
  Award,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  apiClient,
  StudentDashboardSummary,
  StudentDashboardChartPoint,
} from "@repo/api-client";
import { StudentDashboardTab } from "../../components/StudentLayout";

import { Button } from "@repo/ui";
interface ExecutiveDashboardPageProps {
  token: string;
  setActiveTab: (tab: StudentDashboardTab) => void;
}

export function ExecutiveDashboardPage({
  token,
  setActiveTab,
}: ExecutiveDashboardPageProps) {
  const [summary, setSummary] = useState<StudentDashboardSummary | null>(null);
  const [chartData, setChartData] = useState<StudentDashboardChartPoint[]>([]);
  const [chartRange, setChartRange] = useState<"7d" | "30d" | "1y">("30d");
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [token]);

  useEffect(() => {
    loadChart(chartRange);
  }, [chartRange, token]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await apiClient.dashboard.getSummary(token);
      setSummary(data);
    } catch (err) {
      console.error("Failed to load dashboard summary:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadChart = async (range: "7d" | "30d" | "1y") => {
    try {
      setChartLoading(true);
      const points = await apiClient.dashboard.getChartData(range, token);
      setChartData(points);
    } catch (err) {
      console.error("Failed to load chart points:", err);
    } finally {
      setChartLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm">
        Loading Executive Dashboard...
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        Unable to load dashboard data. Please verify your store setup.
      </div>
    );
  }

  // Calculate chart max for scaling
  const maxRevenue = Math.max(...chartData.map((d) => d.revenue), 100);

  return (
    <div className="space-y-8">
      {/* Top Banner / Welcome */}
      <div className="relative flex flex-col justify-between gap-4 overflow-hidden rounded-xl bg-gradient-to-br from-[#0052FF] via-[#0042D0] to-[#0A1E4A] p-6 text-white shadow-sm sm:p-8 md:flex-row md:items-center">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative space-y-1.5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-blue-200" />
            Executive Business Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-heading">
            Commercial Performance & Training
          </h1>
          <p className="max-w-xl text-xs text-blue-100 sm:text-sm">
            Real-time revenues, profit margins, verified customer ratings, and
            guided entrepreneurial milestones.
          </p>
        </div>

        <div className="relative flex flex-wrap gap-2.5">
          <Button onClick={() => setActiveTab("orders")} className="bg-white text-[#0052FF] hover:bg-blue-50 font-semibold shadow-xs">
            Fulfill Orders
          </Button>
          <Button
            variant="outline"
            onClick={() => setActiveTab("reputation")}
            className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white backdrop-blur-xs"
          >
            View Reputation Scorecard
          </Button>
        </div>
      </div>

      {/* 5 Core KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Gross Sales */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Gross Sales</span>
            <div className="p-2 bg-blue-50 text-[#0052FF] rounded-lg">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold tracking-tight text-slate-900">
            ৳{summary.grossSales.toLocaleString()}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold">
            {summary.grossSalesGrowthPercent >= 0 ? (
              <span className="text-emerald-600 flex items-center gap-0.5">
                <TrendingUp className="h-3.5 w-3.5" />
                +{summary.grossSalesGrowthPercent}%
              </span>
            ) : (
              <span className="text-red-500 flex items-center gap-0.5">
                <TrendingDown className="h-3.5 w-3.5" />
                {summary.grossSalesGrowthPercent}%
              </span>
            )}
            <span className="text-slate-400 font-normal">vs prior 30d</span>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Net Profit</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold tracking-tight text-emerald-600">
            ৳{summary.netProfit.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400">
            <span className="font-semibold text-slate-700">
              {summary.profitMarginPercent}%
            </span>{" "}
            take-home margin
          </p>
        </div>

        {/* Total Orders */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Orders</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold tracking-tight text-slate-900">{summary.totalOrders}</p>
          <p className="text-[11px] text-slate-400">
            <span className="font-semibold text-slate-700">
              {summary.completedOrders}
            </span>{" "}
            delivered / completed
          </p>
        </div>

        {/* Active Customers */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Shoppers</span>
            <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold tracking-tight text-slate-900">
            {summary.activeCustomersCount}
          </p>
          <p className="text-[11px] text-slate-400">
            <span className="font-semibold text-slate-700">
              {summary.repeatCustomerPercent}%
            </span>{" "}
            repeat customer rate
          </p>
        </div>

        {/* Store Rating */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Reputation</span>
            <div className="p-2 bg-amber-50 text-amber-500 rounded-lg">
              <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold tracking-tight text-slate-900 flex items-baseline gap-1">
            {summary.storeRating > 0 ? summary.storeRating : "5.0"}
            <span className="text-xs font-normal text-slate-400">/ 5.0</span>
          </p>
          <p className="text-[11px] text-slate-400">
            <span className="font-semibold text-slate-700">
              {summary.totalReviewsCount}
            </span>{" "}
            verified reviews
          </p>
        </div>
      </div>

      {/* Interactive Time-Series Performance Chart */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 sm:p-8 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-heading font-bold text-base text-slate-900">
              Revenue & Profit Timeline
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Daily revenue volume and student net earnings.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
            {(["7d", "30d", "1y"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setChartRange(r)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  chartRange === r
                    ? "bg-[#0052FF] text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "1 Year"}
              </button>
            ))}
          </div>
        </div>

        {/* Responsive SVG Chart */}
        {chartLoading ? (
          <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
            Refreshing timeline data...
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
            No transaction data in this period.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="h-56 flex items-end gap-1.5 sm:gap-2 pt-6">
              {chartData.map((d, idx) => {
                const heightPct = Math.max(
                  6,
                  Math.round((d.revenue / maxRevenue) * 100),
                );
                const profitPct =
                  d.revenue > 0 ? Math.round((d.profit / d.revenue) * 100) : 0;
                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative"
                  >
                    {/* Hover Tooltip */}
                    <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[10px] font-semibold py-1 px-2 rounded-lg pointer-events-none whitespace-nowrap shadow-md">
                      <span>{d.date}</span>
                      <span>
                        Rev: ৳{d.revenue.toLocaleString()} | Profit: ৳
                        {d.profit.toLocaleString()}
                      </span>
                    </div>

                    <div
                      className="w-full bg-primary/10 hover:bg-primary/20 rounded-t-md transition-all relative overflow-hidden flex flex-col justify-end"
                      style={{ height: `${heightPct}%` }}
                    >
                      {/* Inner bar for net profit */}
                      <div
                        className="w-full bg-primary rounded-t-md"
                        style={{ height: `${profitPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X-axis labels */}
            <div className="flex justify-between text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-100">
              <span>{chartData[0]?.date}</span>
              <span>{chartData[Math.floor(chartData.length / 2)]?.date}</span>
              <span>{chartData[chartData.length - 1]?.date}</span>
            </div>

            <div className="flex items-center gap-6 justify-center text-xs font-medium text-slate-600 pt-1">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-primary/10" />
                <span>Gross Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-primary" />
                <span>Net Profit</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lower Row: Recent Orders, Customer Reviews, Training Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Widget */}
        <div className="bg-card border border-border/80 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-primary" />
              Recent Orders
            </h3>
            <button
              onClick={() => setActiveTab("orders")}
              className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-0.5"
            >
              View all <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {summary.recentOrders.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              No orders placed yet.
            </p>
          ) : (
            <div className="divide-y divide-border/60 space-y-2">
              {summary.recentOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="pt-2 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-foreground">{ord.orderNumber}</p>
                    <p className="text-[11px] text-muted-foreground">{ord.customerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">
                      ৳{ord.totalAmount.toLocaleString()}
                    </p>
                    <span className="inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                      +৳{ord.studentNetProfit} profit
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Latest Customer Feedback */}
        <div className="bg-card border border-border/80 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500 fill-amber-400" />
              Latest Feedback
            </h3>
            <button
              onClick={() => setActiveTab("reviews")}
              className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-0.5"
            >
              View all <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {summary.recentReviews.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              No customer reviews submitted yet.
            </p>
          ) : (
            <div className="space-y-3">
              {summary.recentReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-muted/50 border border-border/60 rounded-2xl p-3.5 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">
                      {rev.customerName}
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-amber-600 text-[11px]">
                      {rev.storeRating} ★
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] line-clamp-2">
                    "{rev.productComment || "Great shopping experience!"}"
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Product: {rev.productTitle}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Guided Training Curriculum Progress */}
        <div className="bg-card border border-border/80 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              Training Curriculum
            </h3>
            <span className="text-xs font-bold text-primary">
              {summary.trainingProgress?.overallCompletionPercent}% Completed
            </span>
          </div>

          <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full transition-all"
              style={{
                width: `${summary.trainingProgress?.overallCompletionPercent || 0}%`,
              }}
            />
          </div>

          <div className="space-y-2.5 pt-1">
            {summary.trainingProgress?.modules.map((mod) => (
              <div
                key={mod.id}
                className="flex items-center justify-between text-xs p-2 rounded-xl bg-muted/50 border border-slate-100"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  {mod.status === "COMPLETED" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                  )}
                  <span className="text-slate-700 font-medium truncate">
                    {mod.title}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-muted-foreground">
                  {mod.progressPercent}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

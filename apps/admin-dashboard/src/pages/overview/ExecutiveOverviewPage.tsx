import React, { useState, useEffect } from "react";
import { apiClient, ExecutiveKpis } from "@repo/api-client";
import {
  TrendingUp,
  DollarSign,
  Package,
  Users,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Store,
  ArrowUpRight,
} from "lucide-react";

interface ExecutiveOverviewPageProps {
  token: string;
  setActiveTab?: (tab: any) => void;
}

export const ExecutiveOverviewPage: React.FC<ExecutiveOverviewPageProps> = ({
  token,
  setActiveTab,
}) => {
  const [kpis, setKpis] = useState<ExecutiveKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadKpis();
  }, [token]);

  const loadKpis = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.adminDashboard.getExecutiveKpis(token);
      setKpis(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load executive KPIs");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !kpis) {
    return (
      <div className="p-8">
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">
          {error || "Failed to load dashboard KPIs"}
        </div>
      </div>
    );
  }

  const maxGmvInTrend = Math.max(...kpis.dailyTrends.map((t) => t.gmv), 1);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Institute Executive Command Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Platform-wide gross merchandise value, financial liabilities, and operational fulfillment
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            System Operational
          </span>
          <button
            onClick={loadKpis}
            className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Platform GMV
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-slate-900">
              ৳{kpis.platformGMV.toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Across {kpis.totalOrdersCount} commercial orders
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Institute Net Revenue
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-emerald-600">
              ৳{kpis.instituteNetRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Wholesale margins + platform commissions
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Warehouse Backlog
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-slate-900">
              {kpis.warehouseBacklogCount}
            </div>
            <p className="text-xs text-amber-600 font-medium mt-1">
              Paid / Processing awaiting dispatch
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Student Liabilities
            </span>
            <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-slate-900">
              ৳{kpis.outstandingStudentLiabilities.toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Outstanding wallet balances
            </p>
          </div>
        </div>
      </div>

      {/* 30-Day Platform GMV Trend Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Platform GMV Trend (Last 30 Days)</h2>
            <p className="text-xs text-slate-500">Daily gross transaction volume across all student stores</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400">Total Settled Disbursements</span>
            <div className="text-sm font-bold text-slate-700">৳{kpis.totalSettledPayouts.toLocaleString()}</div>
          </div>
        </div>

        {/* Bar visualization */}
        <div className="h-48 flex items-end gap-1.5 pt-6 border-b border-slate-100">
          {kpis.dailyTrends.map((trend) => {
            const heightPercent = Math.max(8, (trend.gmv / maxGmvInTrend) * 100);
            return (
              <div
                key={trend.date}
                className="flex-1 flex flex-col items-center group relative h-full justify-end"
              >
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                  <div className="bg-slate-900 text-white text-[10px] rounded-md px-2 py-1 shadow-md whitespace-nowrap">
                    <div>{trend.date}</div>
                    <div className="font-bold text-blue-300">৳{trend.gmv.toLocaleString()}</div>
                    <div className="text-slate-400">{trend.orders} orders</div>
                  </div>
                </div>
                {/* Bar */}
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-t-sm transition-all ${
                    trend.gmv > 0
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-slate-100 hover:bg-slate-200"
                  }`}
                ></div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between items-center text-[10px] text-slate-400 pt-3">
          <span>{kpis.dailyTrends[0]?.date}</span>
          <span>Daily Volume</span>
          <span>{kpis.dailyTrends[kpis.dailyTrends.length - 1]?.date}</span>
        </div>
      </div>

      {/* Secondary Operational Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stores Health */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Student Store Operations</h3>
            <Store className="h-4 w-4 text-slate-400" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Active Published Stores</span>
              <span className="font-bold text-emerald-600">{kpis.stores.active}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Draft Setup Phase</span>
              <span className="font-bold text-slate-500">{kpis.stores.draft}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Suspended for Audit</span>
              <span className="font-bold text-red-600">{kpis.stores.suspended}</span>
            </div>
          </div>
          {setActiveTab && (
            <button
              onClick={() => setActiveTab("students")}
              className="mt-6 w-full py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 border border-slate-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              Manage Student Stores <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Student Enrollment */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Student Reseller Cohort</h3>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Total Enrolled Resellers</span>
              <span className="font-bold text-slate-900">{kpis.students.total}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Verified Identity</span>
              <span className="font-bold text-blue-600">{kpis.students.verified}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Pending Verification</span>
              <span className="font-bold text-amber-600">
                {kpis.students.total - kpis.students.verified}
              </span>
            </div>
          </div>
          {setActiveTab && (
            <button
              onClick={() => setActiveTab("payouts")}
              className="mt-6 w-full py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 border border-slate-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              Review Financial Payouts <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Urgent Actions Hub */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-6 rounded-2xl text-white shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <AlertTriangle className="h-4 w-4" /> Operational Attention
            </div>
            <h3 className="text-lg font-bold">Fulfillment Queue</h3>
            <p className="text-xs text-slate-300 mt-1">
              {kpis.warehouseBacklogCount} order(s) currently require packing, consignment assignment, or courier dispatch.
            </p>
          </div>

          <div className="mt-6">
            {setActiveTab && (
              <button
                onClick={() => setActiveTab("fulfillment")}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white shadow-md transition-colors"
              >
                Go to Fulfillment Center
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

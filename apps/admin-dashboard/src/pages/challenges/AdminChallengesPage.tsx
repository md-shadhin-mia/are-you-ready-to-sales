import React, { useEffect, useState } from "react";
import {
  Trophy,
  Award,
  Users,
  Sparkles,
  CheckCircle,
  Loader2,
  AlertCircle,
  Layers,
} from "lucide-react";
import { apiClient, GamificationChallenge } from "@repo/api-client";

interface AdminChallengesPageProps {
  token: string;
}

export const AdminChallengesPage: React.FC<AdminChallengesPageProps> = ({ token }) => {
  const [challenges, setChallenges] = useState<GamificationChallenge[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiClient.gamification.listAdminChallenges(token),
      apiClient.gamification.getAdminOverview(token),
    ])
      .then(([chalData, ovData]) => {
        setChallenges(chalData);
        setOverview(ovData);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || "Failed to load challenges overview");
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading && !overview) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-xs font-semibold">Loading Challenges & Student Distribution...</p>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs flex items-center gap-3">
        <AlertCircle className="h-5 w-5 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <Trophy className="h-7 w-7 text-amber-500" />
          Milestones & Gamification Management
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Monitor entrepreneurial milestones, experience points (XP) distribution, and student advancement across qualification tiers.
        </p>
      </div>

      {/* KPI Overview */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
              Enrolled Students
            </p>
            <p className="text-2xl font-black text-slate-900">
              {overview.totalStudents}
            </p>
            <p className="text-[11px] text-slate-400">Active platform resellers</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
              Total XP Awarded
            </p>
            <p className="text-2xl font-black text-amber-600">
              {overview.totalXpAwarded.toLocaleString()} XP
            </p>
            <p className="text-[11px] text-slate-400">Cumulative commercial experience</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
              Completed Milestones
            </p>
            <p className="text-2xl font-black text-emerald-600">
              {overview.totalCompletions}
            </p>
            <p className="text-[11px] text-slate-400">Total verified milestones finished</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
              Challenges Configured
            </p>
            <p className="text-2xl font-black text-blue-600">
              {overview.totalChallenges}
            </p>
            <p className="text-[11px] text-slate-400">Across 6 qualification tiers</p>
          </div>
        </div>
      )}

      {/* Level Distribution */}
      {overview && overview.levelDistribution && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <Award className="h-4 w-4 text-blue-600" />
            Student Distribution by Career Level
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[1, 2, 3, 4, 5, 6].map((lvl) => {
              const count = overview.levelDistribution[lvl] || 0;
              const titles = [
                "Store Starter",
                "Product Seller",
                "Active Reseller",
                "Growth Seller",
                "Pro Seller",
                "Top Performer",
              ];
              return (
                <div
                  key={lvl}
                  className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center space-y-1"
                >
                  <span className="h-7 w-7 rounded-xl bg-slate-900 text-white text-xs font-black inline-flex items-center justify-center">
                    L{lvl}
                  </span>
                  <p className="text-xs font-extrabold text-slate-900 truncate">
                    {titles[lvl - 1]}
                  </p>
                  <p className="text-xl font-black text-blue-600 font-mono">{count}</p>
                  <p className="text-[10px] text-slate-400">students</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Challenges Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-6 sm:p-8">
        <div>
          <h3 className="font-extrabold text-sm text-slate-900">
            Platform Challenges & Event Rules
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational milestones evaluated by the event-driven gamification listener.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Code</th>
                <th className="px-6 py-3.5">Title & Description</th>
                <th className="px-6 py-3.5">Required Event</th>
                <th className="px-6 py-3.5">Threshold</th>
                <th className="px-6 py-3.5">Tier</th>
                <th className="px-6 py-3.5 text-right">XP Reward</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {challenges.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-slate-900">
                    {c.code}
                  </td>
                  <td className="px-6 py-4 max-w-sm">
                    <p className="font-extrabold text-slate-900">{c.title}</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">{c.description}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                      {c.requiredEvent || (c as any).required_event || "event"}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-700">
                    {c.threshold.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      Tier {c.tierLevel}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-amber-600">
                    +{c.xpReward} XP
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

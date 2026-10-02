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

import { PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui";
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
      <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs font-semibold">Loading Challenges & Student Distribution...</p>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="p-6 bg-destructive/5 border border-destructive/20 rounded-2xl text-destructive text-xs flex items-center gap-3">
        <AlertCircle className="h-5 w-5 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="Milestones & Gamification Management"
        description="Monitor entrepreneurial milestones, experience points (XP) distribution, and student advancement across qualification tiers."
        icon={Trophy}
      />

      {/* KPI Overview */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card p-5 rounded-xl border border-border shadow-xs space-y-1">
            <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">
              Enrolled Students
            </p>
            <p className="text-2xl font-bold text-foreground">
              {overview.totalStudents}
            </p>
            <p className="text-[11px] text-slate-400">Active platform resellers</p>
          </div>

          <div className="bg-card p-5 rounded-xl border border-border shadow-xs space-y-1">
            <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">
              Total XP Awarded
            </p>
            <p className="text-2xl font-bold text-amber-600">
              {overview.totalXpAwarded.toLocaleString()} XP
            </p>
            <p className="text-[11px] text-slate-400">Cumulative commercial experience</p>
          </div>

          <div className="bg-card p-5 rounded-xl border border-border shadow-xs space-y-1">
            <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">
              Completed Milestones
            </p>
            <p className="text-2xl font-bold text-emerald-600">
              {overview.totalCompletions}
            </p>
            <p className="text-[11px] text-slate-400">Total verified milestones finished</p>
          </div>

          <div className="bg-card p-5 rounded-xl border border-border shadow-xs space-y-1">
            <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">
              Challenges Configured
            </p>
            <p className="text-2xl font-bold text-primary">
              {overview.totalChallenges}
            </p>
            <p className="text-[11px] text-slate-400">Across 6 qualification tiers</p>
          </div>
        </div>
      )}

      {/* Level Distribution */}
      {overview && overview.levelDistribution && (
        <div className="bg-card p-6 rounded-xl border border-border shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
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
                  className="bg-muted/50 p-4 rounded-2xl border border-border text-center space-y-1"
                >
                  <span className="h-7 w-7 rounded-xl bg-slate-900 text-white text-xs font-bold inline-flex items-center justify-center">
                    L{lvl}
                  </span>
                  <p className="text-xs font-extrabold text-foreground truncate">
                    {titles[lvl - 1]}
                  </p>
                  <p className="text-xl font-bold text-primary font-mono">{count}</p>
                  <p className="text-[10px] text-slate-400">students</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Challenges Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-xs space-y-4 p-6 sm:p-8">
        <div>
          <h3 className="font-extrabold text-sm text-foreground">
            Platform Challenges & Event Rules
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Operational milestones evaluated by the event-driven gamification listener.
          </p>
        </div>

        <div className="overflow-x-auto">
          <Table className="w-full text-left text-xs">
            <TableHeader className="bg-muted/50 border-b border-border text-muted-foreground font-bold uppercase text-[10px] tracking-wider">
              <TableRow>
                <TableHead className="px-6 py-3.5">Code</TableHead>
                <TableHead className="px-6 py-3.5">Title & Description</TableHead>
                <TableHead className="px-6 py-3.5">Required Event</TableHead>
                <TableHead className="px-6 py-3.5">Threshold</TableHead>
                <TableHead className="px-6 py-3.5">Tier</TableHead>
                <TableHead className="px-6 py-3.5 text-right">XP Reward</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60">
              {challenges.map((c) => (
                <TableRow key={c.id} className="hover:bg-muted/50/60 transition-colors">
                  <TableCell className="px-6 py-4 font-mono font-bold text-foreground">
                    {c.code}
                  </TableCell>
                  <TableCell className="px-6 py-4 max-w-sm">
                    <p className="font-extrabold text-foreground">{c.title}</p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">{c.description}</p>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <span className="font-mono text-[11px] bg-muted px-2 py-0.5 rounded text-slate-700">
                      {c.requiredEvent || (c as any).required_event || "event"}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 font-semibold text-slate-700">
                    {c.threshold.toLocaleString()}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/5 text-primary border border-primary/20">
                      Tier {c.tierLevel}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right font-bold text-amber-600">
                    +{c.xpReward} XP
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

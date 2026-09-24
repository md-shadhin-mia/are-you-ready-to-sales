import React, { useEffect, useState } from "react";
import {
  Trophy,
  Award,
  Sparkles,
  CheckCircle2,
  Lock,
  ArrowRight,
  TrendingUp,
  ShoppingBag,
  Star,
  Gift,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { apiClient, StudentGamificationStatus } from "@repo/api-client";
import { Button } from "@repo/ui";

interface GamificationPageProps {
  token: string;
}

export const GamificationPage: React.FC<GamificationPageProps> = ({ token }) => {
  const [status, setStatus] = useState<StudentGamificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [celebrationMessage, setCelebrationMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");

  const fetchStatus = () => {
    setLoading(true);
    apiClient.gamification
      .getStatus(token)
      .then((data) => {
        setStatus(data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || "Failed to load career progression");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStatus();
  }, [token]);

  const handleClaimReward = async (challengeId: string, challengeTitle: string) => {
    setClaimingId(challengeId);
    setCelebrationMessage(null);
    try {
      const res = await apiClient.gamification.claimReward(challengeId, token);
      setCelebrationMessage(
        `🎉 Claimed +${res.claimedXp} XP! You are now Level ${res.currentLevel} (${res.levelTitle})!`,
      );
      fetchStatus();
    } catch (err: any) {
      setError(err.message || "Failed to claim reward");
    } finally {
      setClaimingId(null);
    }
  };

  if (loading && !status) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-xs font-semibold">Loading Career Roadmap & Milestones...</p>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs flex items-center gap-3">
        <AlertCircle className="h-5 w-5 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (!status) return null;

  const activeChallenges = status.challenges.filter((c) => !c.isCompleted);
  const completedChallenges = status.challenges.filter((c) => c.isCompleted);

  // Compute XP progress percentage
  const currentLevelXpThreshold = 0; // baseline
  const nextTargetXp = status.nextLevel ? status.nextLevel.xpNeeded + status.totalXp : status.totalXp;
  const xpPercent =
    status.nextLevel && nextTargetXp > 0
      ? Math.min(100, Math.round((status.totalXp / nextTargetXp) * 100))
      : 100;

  const levelRoadmap = [
    { level: 1, title: "Store Starter", xp: 0, orders: 0, sales: "৳0" },
    { level: 2, title: "Product Seller", xp: 500, orders: 1, sales: "৳1,000" },
    { level: 3, title: "Active Reseller", xp: 2000, orders: 10, sales: "৳10,000", rating: "4.0★" },
    { level: 4, title: "Growth Seller", xp: 6000, orders: 50, sales: "৳50,000", rating: "4.3★" },
    { level: 5, title: "Pro Seller", xp: 15000, orders: 150, sales: "৳150,000", rating: "4.5★" },
    { level: 6, title: "Top Performer", xp: 50000, orders: 500, sales: "৳500,000", rating: "4.7★" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <Trophy className="h-7 w-7 text-amber-500" />
          Entrepreneurial Career Progression
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Complete verified commercial milestones to gain XP, unlock premium reseller perks, and reduce platform commissions.
        </p>
      </div>

      {celebrationMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between text-xs text-emerald-800 font-bold shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            <span>{celebrationMessage}</span>
          </div>
          <button
            onClick={() => setCelebrationMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Hero Level & XP Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Current Tier */}
          <div className="lg:col-span-4 flex items-center gap-5">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 flex items-center justify-center text-slate-950 shadow-lg font-black text-3xl">
              L{status.currentLevel}
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300 bg-blue-900/50 px-2.5 py-1 rounded-md border border-blue-700/50">
                Level {status.currentLevel} Reseller
              </span>
              <h2 className="text-xl sm:text-2xl font-black mt-1.5 leading-tight">
                {status.levelTitle}
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Platform Commission:{" "}
                <span className="text-amber-400 font-bold">
                  {(status.commissionRate * 100).toFixed(1)}%
                </span>
              </p>
            </div>
          </div>

          {/* Center: XP Progress Bar */}
          <div className="lg:col-span-5 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">
                Experience Points (XP)
              </span>
              <span className="font-bold text-amber-400">
                {status.totalXp.toLocaleString()} XP
                {status.nextLevel && !status.nextLevel.isMaxLevel && (
                  <span className="text-slate-400 font-normal ml-1">
                    / {nextTargetXp.toLocaleString()} XP
                  </span>
                )}
              </span>
            </div>

            <div className="h-3 w-full bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700">
              <div
                style={{ width: `${xpPercent}%` }}
                className="h-full bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full transition-all duration-500"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Current: {status.totalXp} XP</span>
              {status.nextLevel && !status.nextLevel.isMaxLevel ? (
                <span>
                  {status.nextLevel.xpNeeded} XP needed for {status.nextLevel.title}
                </span>
              ) : (
                <span className="text-emerald-400 font-bold">Max Tier Achieved!</span>
              )}
            </div>
          </div>

          {/* Right: Metrics Snapshot */}
          <div className="lg:col-span-3 grid grid-cols-3 gap-2 bg-white/5 p-3.5 rounded-2xl border border-white/10 text-center">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Orders</p>
              <p className="text-sm font-black text-white mt-0.5">
                {status.metrics.completedOrders}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Sales</p>
              <p className="text-sm font-black text-white mt-0.5">
                ৳{(status.metrics.grossRevenue / 1000).toFixed(1)}k
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Rating</p>
              <p className="text-sm font-black text-amber-400 mt-0.5 flex items-center justify-center gap-0.5">
                <Star className="h-3 w-3 fill-amber-400" />
                {Number(status.metrics.ratingAvg).toFixed(1)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 6-Tier Career Roadmap */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
          <Award className="h-4 w-4 text-blue-600" />
          Qualification Roadmap (Level 1 → Level 6)
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {levelRoadmap.map((t) => {
            const isUnlocked = status.currentLevel >= t.level;
            const isCurrent = status.currentLevel === t.level;
            return (
              <div
                key={t.level}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isCurrent
                    ? "bg-blue-50 border-blue-500 shadow-sm ring-2 ring-blue-500/20"
                    : isUnlocked
                      ? "bg-slate-50 border-slate-200"
                      : "bg-slate-50/50 border-slate-100 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`h-6 w-6 rounded-lg text-xs font-black flex items-center justify-center ${
                      isCurrent
                        ? "bg-blue-600 text-white"
                        : isUnlocked
                          ? "bg-slate-800 text-white"
                          : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {t.level}
                  </span>
                  {isUnlocked ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                  )}
                </div>

                <p className="font-extrabold text-xs text-slate-900 mt-2 truncate">
                  {t.title}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  {t.xp.toLocaleString()} XP • {t.orders} Orders
                </p>
                <p className="text-[10px] text-slate-500">
                  {t.sales} Sales {t.rating ? `• ${t.rating}` : ""}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unlocked Perks vs Next Perks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Currently Active Perks (Level {status.currentLevel})
          </div>
          <ul className="space-y-2">
            {status.unlockedPerks.map((perk, i) => (
              <li
                key={i}
                className="flex items-center gap-2.5 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>{perk}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
            <Lock className="h-4 w-4 text-slate-400" />
            {status.nextLevel && !status.nextLevel.isMaxLevel
              ? `Upcoming Perks (Level ${status.nextLevel.level}: ${status.nextLevel.title})`
              : "All Available Platform Perks Unlocked"}
          </div>
          {status.nextLevel && !status.nextLevel.isMaxLevel ? (
            <div className="space-y-3 text-xs text-slate-600">
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-blue-900">
                <p className="font-bold text-[11px] uppercase tracking-wider text-blue-700">
                  Requirements for Level {status.nextLevel.level}:
                </p>
                <ul className="mt-1 space-y-1 text-xs">
                  <li>• Experience: {status.nextLevel.xpNeeded} XP needed</li>
                  <li>• Deliveries: {status.nextLevel.ordersNeeded} orders needed</li>
                  <li>• Revenue: ৳{status.nextLevel.revenueNeeded.toLocaleString()} needed</li>
                  {status.nextLevel.ratingNeeded > 0 && (
                    <li>• Rating: {status.nextLevel.ratingNeeded}★ minimum required</li>
                  )}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Congratulations! You have reached the pinnacle tier of the incubator program.
            </p>
          )}
        </div>
      </div>

      {/* Challenges & Milestones Section */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <Gift className="h-4 w-4 text-blue-600" />
              Verified Business Challenges ({status.challenges.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Achieve real commercial milestones to claim XP and advance your rank.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("active")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === "active"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              In Progress ({activeChallenges.length})
            </button>
            <button
              onClick={() => setActiveTab("completed")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === "completed"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Completed ({completedChallenges.length})
            </button>
          </div>
        </div>

        {/* Challenges Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(activeTab === "active" ? activeChallenges : completedChallenges).map((chal) => {
            const isFinished = chal.isCompleted;
            const isClaimed = chal.isClaimed;
            const progressPercent = Math.min(
              100,
              Math.round((chal.currentCount / chal.threshold) * 100),
            );

            return (
              <div
                key={chal.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isFinished
                    ? isClaimed
                      ? "bg-slate-50 border-slate-200"
                      : "bg-emerald-50/50 border-emerald-300 ring-2 ring-emerald-500/20"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        Tier {chal.tierLevel}
                      </span>
                      <h4 className="font-extrabold text-sm text-slate-900 mt-1.5">
                        {chal.title}
                      </h4>
                    </div>
                    <span className="font-black text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl flex items-center gap-1 flex-shrink-0">
                      <Sparkles className="h-3.5 w-3.5" />
                      +{chal.xpReward} XP
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">
                    {chal.description}
                  </p>
                </div>

                <div className="mt-5 space-y-2">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Progress</span>
                    <span className="font-bold text-slate-700">
                      {chal.currentCount} / {chal.threshold}
                    </span>
                  </div>

                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${progressPercent}%` }}
                      className={`h-full rounded-full transition-all duration-300 ${
                        isFinished ? "bg-emerald-500" : "bg-blue-600"
                      }`}
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    {isFinished ? (
                      isClaimed ? (
                        <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          Reward Claimed
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          disabled={claimingId === chal.id}
                          onClick={() => handleClaimReward(chal.id, chal.title)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 w-full py-2 rounded-xl shadow-xs"
                        >
                          {claimingId === chal.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5" />
                          )}
                          Claim +{chal.xpReward} XP Reward!
                        </Button>
                      )
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">
                        In progress (auto-tracks events)
                      </span>
                    )}
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

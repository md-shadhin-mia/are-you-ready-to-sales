import React, { useState, useEffect } from "react";
import {
  Award,
  Star,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Lightbulb,
  Truck,
  Users,
  Store,
  ArrowRight,
} from "lucide-react";
import { apiClient, StoreReputation } from "@repo/api-client";

import { PageHeader } from "@repo/ui";
interface StudentReputationPageProps {
  token: string;
}

export function StudentReputationPage({ token }: StudentReputationPageProps) {
  const [reputation, setReputation] = useState<StoreReputation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReputation();
  }, [token]);

  const loadReputation = async () => {
    try {
      setLoading(true);
      const data = await apiClient.reputation.getStudentScorecard(token);
      setReputation(data);
    } catch (err) {
      console.error("Failed to load reputation scorecard:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm">
        Loading Store Reputation Scorecard...
      </div>
    );
  }

  if (!reputation) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        Unable to load reputation data.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="Store Reputation & Seller Scorecard"
        description="Your public trust metric combining verified ratings, order completion rates, and customer loyalty."
        icon={Award}
      />

      {/* Main Scorecard Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Composite Score Card */}
        <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white rounded-3xl p-8 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-bold">
              <ShieldCheck className="h-3.5 w-3.5" />
              Seller Trust Index
            </span>
            <h2 className="text-xl font-bold">Composite Performance</h2>
            <p className="text-xs text-slate-300">
              Computed algorithmically from store feedback, fulfillment rate, and customer retention.
            </p>
          </div>

          <div className="py-4">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-amber-400">
                {reputation.compositeScore}
              </span>
              <span className="text-lg text-slate-400 font-semibold">/ 5.0</span>
            </div>
            <div className="flex items-center gap-1 mt-2 text-amber-400">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-5 w-5 ${
                    s <= Math.round(reputation.compositeScore)
                      ? "fill-current"
                      : "text-slate-700"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Storefront Trust Badge Preview */}
          <div className="bg-card/10 backdrop-blur-md rounded-xl p-4 border border-white/10 space-y-2">
            <p className="text-[11px] uppercase font-bold text-slate-300 tracking-wider">
              Storefront Badge Preview
            </p>
            <div className="inline-flex items-center gap-2 bg-card text-foreground px-3.5 py-1.5 rounded-full text-xs font-bold shadow-xs">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
              <span>{reputation.trustBadge?.badgeText}</span>
            </div>
          </div>
        </div>

        {/* 3 Metric Progress Columns */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 1. Store Rating */}
          <div className="bg-card border border-border/80 rounded-xl p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl w-fit">
                <Store className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-sm text-foreground pt-2">
                Store Rating
              </h3>
              <p className="text-xs text-muted-foreground">
                Average feedback on merchant service.
              </p>
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">
                {reputation.ratingAvg > 0 ? reputation.ratingAvg : "5.0"} ★
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {reputation.totalReviewsCount} verified reviews
              </p>
            </div>
          </div>

          {/* 2. Order Completion Rate */}
          <div className="bg-card border border-border/80 rounded-xl p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl w-fit">
                <Truck className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-sm text-foreground pt-2">
                Completion Rate
              </h3>
              <p className="text-xs text-muted-foreground">
                Delivered without cancellation.
              </p>
            </div>
            <div>
              <p className="text-3xl font-bold text-emerald-600">
                {(reputation as any).completionRatePercent ?? 100}%
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {reputation.completedOrdersCount} orders completed
              </p>
            </div>
          </div>

          {/* 3. Repeat Customer Rate */}
          <div className="bg-card border border-border/80 rounded-xl p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <div className="p-2.5 bg-sky-50 text-sky-600 rounded-2xl w-fit">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-sm text-foreground pt-2">
                Repeat Shoppers
              </h3>
              <p className="text-xs text-muted-foreground">
                Customers placing multiple orders.
              </p>
            </div>
            <div>
              <p className="text-3xl font-bold text-sky-600">
                {reputation.repeatCustomerPercent}%
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                High loyalty increases rank
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actionable Seller Tips */}
      <div className="bg-card border border-border/80 rounded-xl p-6 sm:p-8 shadow-xs space-y-4">
        <h3 className="font-bold text-base text-foreground flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          Personalized Merchant Advice
        </h3>
        <p className="text-xs text-muted-foreground">
          Actionable recommendations generated from your store's live commercial metrics:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {reputation.tips && reputation.tips.length > 0 ? (
            reputation.tips.map((tip, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-muted/50 border border-border/80 flex items-start gap-3"
              >
                <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <p className="text-xs text-slate-700 font-medium leading-relaxed">
                  {tip}
                </p>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400">
              No performance warnings. Keep up the high standard!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

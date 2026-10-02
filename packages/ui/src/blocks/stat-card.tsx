import * as React from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "../lib/utils";
import { Card } from "../components/card";

type Tone = "primary" | "accent" | "info" | "destructive" | "muted";

const toneClasses: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent/15 text-amber-700",
  info: "bg-info/10 text-sky-700",
  destructive: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-muted-foreground",
};

interface StatCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: Tone;
  /** Percent change; positive renders green, negative red. */
  delta?: number;
  className?: string;
  onClick?: () => void;
}

export function StatCard({ label, value, hint, icon: Icon, tone = "primary", delta, className, onClick }: StatCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn("p-5", onClick && "cursor-pointer transition-shadow hover:shadow-md", className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="truncate font-heading text-2xl font-bold text-foreground">{value}</p>
        </div>
        {Icon && (
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", toneClasses[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      {(hint || delta !== undefined) && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          {delta !== undefined && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-semibold",
                delta >= 0 ? "text-emerald-600" : "text-destructive",
              )}
            >
              {delta >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {Math.abs(delta).toFixed(1)}%
            </span>
          )}
          {hint}
        </div>
      )}
    </Card>
  );
}

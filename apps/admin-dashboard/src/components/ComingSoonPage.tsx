import React, { useState } from "react";
import {
  Sparkles,
  Layers,
  Database,
  Terminal,
  CheckCircle2,
  Clock,
  Bell,
  ArrowRight,
  ShieldCheck,
  Search,
  Filter,
  Plus,
  ChevronRight,
  ExternalLink,
  Table as TableIcon,
  Send,
  Check,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  Button,
  Badge,
  Input,
} from "@repo/ui";
import { FEATURE_METADATA_MAP, FeatureMetadata } from "../config/featureMetadata";

interface ComingSoonPageProps {
  featureKey: string;
  defaultTitle?: string;
  defaultCategory?: string;
  defaultDescription?: string;
}

export const ComingSoonPage: React.FC<ComingSoonPageProps> = ({
  featureKey,
  defaultTitle,
  defaultCategory,
  defaultDescription,
}) => {
  const metadata: FeatureMetadata = FEATURE_METADATA_MAP[featureKey] || {
    id: featureKey,
    title: defaultTitle || featureKey.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    category: defaultCategory || "Platform Module",
    description:
      defaultDescription ||
      "This module is part of the comprehensive administration roadmap and is currently scheduled for upcoming sprint release.",
    status: "In Design",
    targetRelease: "Next Quarterly Cycle",
    plannedCapabilities: [
      "Full administrative CRUD governance and audit tracking",
      "Real-time event logging and status state machine",
      "Role-based permission gating and exportable reporting",
    ],
  };

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  const handleSubscribe = () => {
    setIsSubscribed(true);
  };

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback.trim()) {
      setFeedbackSent(true);
      setFeedback("");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Breadcrumb & Header Banner */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {metadata.category}
              </span>
              <span className="text-muted-foreground/60">•</span>
              <span className="text-xs font-medium text-primary">Module Blueprint</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
              {metadata.title}
              <Badge variant="secondary" className="text-[11px] font-medium border-border/80">
                <Clock className="mr-1 h-3 w-3 text-amber-500" />
                Coming Soon
              </Badge>
              {metadata.targetRelease && (
                <Badge variant="outline" className="text-[11px] font-mono text-muted-foreground">
                  {metadata.targetRelease}
                </Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
              {metadata.description}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isSubscribed ? (
              <Button variant="outline" size="sm" className="gap-2 text-emerald-500 border-emerald-500/30">
                <Check className="h-4 w-4" />
                Notification Enabled
              </Button>
            ) : (
              <Button onClick={handleSubscribe} size="sm" className="gap-2 shadow-xs">
                <Bell className="h-4 w-4" />
                Notify When Live
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mock Metrics Row if available */}
      {metadata.mockMetrics && metadata.mockMetrics.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {metadata.mockMetrics.map((metric, i) => (
            <Card key={i} className="bg-card/50 border-border">
              <CardContent className="p-4 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-bold font-mono text-foreground">{metric.value}</span>
                  {metric.change && (
                    <span className="text-[11px] font-medium text-primary">{metric.change}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Grid: Planned Capabilities & Architecture Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Planned Capabilities */}
        <Card className="lg:col-span-2 border-border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Planned Functional Capabilities
            </CardTitle>
            <CardDescription className="text-xs">
              Key operational workflows and system automation designed for this module.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {metadata.plannedCapabilities.map((cap, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/20 p-3"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <span className="text-xs text-foreground/90 font-medium leading-relaxed">
                    {cap}
                  </span>
                </div>
              ))}
            </div>

            {/* Technical API & DB Spec Section */}
            {(metadata.databaseSchema || metadata.apiEndpoints) && (
              <div className="mt-6 pt-5 border-t border-border space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Database className="h-3.5 w-3.5" />
                  Technical Specification & Data Contract
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Database Model */}
                  {metadata.databaseSchema && (
                    <div className="rounded-lg border border-border/80 bg-sidebar/50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white font-mono">
                          model {metadata.databaseSchema.modelName}
                        </span>
                        <Badge variant="outline" className="text-[10px] text-sidebar-muted">
                          Prisma Schema
                        </Badge>
                      </div>
                      <div className="font-mono text-[11px] text-sidebar-muted space-y-1 bg-black/40 p-2.5 rounded border border-sidebar-border">
                        {metadata.databaseSchema.fields.map((field, fIdx) => (
                          <div key={fIdx} className="text-primary-foreground/80">
                            + {field}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Planned API Endpoints */}
                  {metadata.apiEndpoints && (
                    <div className="rounded-lg border border-border/80 bg-sidebar/50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">REST API Endpoints</span>
                        <Badge variant="outline" className="text-[10px] text-sidebar-muted">
                          NestJS Routes
                        </Badge>
                      </div>
                      <div className="space-y-1.5 font-mono text-[11px]">
                        {metadata.apiEndpoints.map((api, aIdx) => (
                          <div
                            key={aIdx}
                            className="bg-black/40 p-2 rounded border border-sidebar-border flex flex-col gap-0.5"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  api.method === "GET"
                                    ? "bg-blue-600/30 text-blue-400 border border-blue-500/40"
                                    : api.method === "POST"
                                      ? "bg-emerald-600/30 text-emerald-400 border border-emerald-500/40"
                                      : "bg-amber-600/30 text-amber-400 border border-amber-500/40"
                                }`}
                              >
                                {api.method}
                              </span>
                              <span className="text-white/90 truncate">{api.endpoint}</span>
                            </div>
                            <span className="text-[10px] font-sans text-sidebar-muted">
                              {api.description}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feedback & Requirement Submission */}
        <Card className="border-border shadow-xs flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Administrative Input
            </CardTitle>
            <CardDescription className="text-xs">
              Help prioritize requirements or request custom attributes for this screen.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Our engineering team is actively building out this interface. You can suggest workflow requirements or report business rules below.
              </p>

              {feedbackSent ? (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Your feedback has been logged for the sprint team.
                </div>
              ) : (
                <form onSubmit={handleSendFeedback} className="space-y-2.5">
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="E.g., Please ensure support for barcode scanners and bulk CSV import..."
                    className="w-full h-24 rounded-md border border-input bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    variant="secondary"
                    className="w-full gap-2 text-xs"
                    disabled={!feedback.trim()}
                  >
                    <Send className="h-3.5 w-3.5" />
                    Submit Requirement
                  </Button>
                </form>
              )}
            </div>

            <div className="rounded-lg border border-border/80 bg-muted/30 p-3 space-y-1">
              <p className="text-[11px] font-semibold text-foreground">Need this prioritized?</p>
              <p className="text-[10px] text-muted-foreground">
                Priority feature escalations can be marked by the Operations Director in System Settings.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Blueprint / Wireframe Skeleton Preview */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TableIcon className="h-4 w-4 text-primary" />
              UI Blueprint & Screen Wireframe Preview
            </CardTitle>
            <CardDescription className="text-xs">
              Interactive layout preview depicting the planned console interface and action controls.
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-primary/40 text-primary text-[10px] font-mono">
            ENGINEERING PREVIEW
          </Badge>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          {/* Wireframe Mock Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 opacity-75">
            <div className="flex items-center gap-2 w-full sm:w-72">
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  disabled
                  placeholder={`Search ${metadata.title.toLowerCase()}...`}
                  className="w-full rounded-md border border-border bg-muted/20 pl-8 pr-3 py-1.5 text-xs text-muted-foreground cursor-not-allowed"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                disabled
                className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground cursor-not-allowed"
              >
                <Filter className="h-3.5 w-3.5" />
                Filter
              </button>
              <button
                disabled
                className="flex items-center gap-1.5 rounded-md bg-primary/60 px-3 py-1.5 text-xs font-medium text-primary-foreground cursor-not-allowed"
              >
                <Plus className="h-3.5 w-3.5" />
                Create New
              </button>
            </div>
          </div>

          {/* Wireframe Mock Table */}
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-3 font-semibold">Reference ID</th>
                  <th className="p-3 font-semibold">Title / Item</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Assigned Agent / Hub</th>
                  <th className="p-3 font-semibold">Created Date</th>
                  <th className="p-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-mono text-[11px] text-muted-foreground">
                <tr className="hover:bg-muted/10 transition-colors">
                  <td className="p-3 text-primary font-semibold">#REF-2026-081</td>
                  <td className="p-3 font-sans text-foreground">Standard Item Entry Record A</td>
                  <td className="p-3">
                    <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-400">
                      QUEUED
                    </span>
                  </td>
                  <td className="p-3 font-sans">Dhaka Main Hub</td>
                  <td className="p-3">2026-09-27</td>
                  <td className="p-3 text-right">
                    <span className="text-muted-foreground hover:text-white cursor-not-allowed">
                      Manage →
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-muted/10 transition-colors">
                  <td className="p-3 text-primary font-semibold">#REF-2026-082</td>
                  <td className="p-3 font-sans text-foreground">Standard Item Entry Record B</td>
                  <td className="p-3">
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      VERIFIED
                    </span>
                  </td>
                  <td className="p-3 font-sans">Chittagong Hub</td>
                  <td className="p-3">2026-09-26</td>
                  <td className="p-3 text-right">
                    <span className="text-muted-foreground hover:text-white cursor-not-allowed">
                      Manage →
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-muted/10 transition-colors">
                  <td className="p-3 text-primary font-semibold">#REF-2026-083</td>
                  <td className="p-3 font-sans text-foreground">Standard Item Entry Record C</td>
                  <td className="p-3">
                    <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                      PENDING AUDIT
                    </span>
                  </td>
                  <td className="p-3 font-sans">Sylhet Center</td>
                  <td className="p-3">2026-09-25</td>
                  <td className="p-3 text-right">
                    <span className="text-muted-foreground hover:text-white cursor-not-allowed">
                      Manage →
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
            <span>Showing 3 mock records in blueprint layout</span>
            <span className="font-mono">Page 1 of 1</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

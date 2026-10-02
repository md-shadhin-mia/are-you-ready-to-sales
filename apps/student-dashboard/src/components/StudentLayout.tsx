import React from "react";
import {
  Compass,
  Store,
  Box,
  Truck,
  Users,
  LayoutDashboard,
  Star,
  Award,
  Trophy,
  Megaphone,
  BarChart3,
  Wallet,
  CreditCard,
  Sparkles,
} from "lucide-react";
import { AppShell, AppShellNavGroup } from "@repo/ui";
import { WinIcon } from "./WinLogo";

export type StudentDashboardTab =
  | "dashboard"
  | "marketplace"
  | "store-builder"
  | "my-products"
  | "orders"
  | "wallet"
  | "billing"
  | "gamification"
  | "marketing"
  | "analytics"
  | "reviews"
  | "reputation"
  | "crm"
  | "onboarding";

interface StudentLayoutProps {
  children: React.ReactNode;
  activeTab: StudentDashboardTab;
  setActiveTab: (tab: StudentDashboardTab) => void;
  user: any;
  onLogout: () => void;
}

const NAV_GROUPS: AppShellNavGroup<StudentDashboardTab>[] = [
  {
    label: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "analytics", label: "Funnel & Coach", icon: BarChart3 },
    ],
  },
  {
    label: "Store",
    items: [
      { id: "store-builder", label: "Store Builder", icon: Store },
      { id: "my-products", label: "My Products", icon: Box },
      { id: "marketplace", label: "Wholesale Catalog", icon: Compass },
      { id: "orders", label: "Orders & Profits", icon: Truck },
    ],
  },
  {
    label: "Growth",
    items: [
      { id: "marketing", label: "Marketing", icon: Megaphone },
      { id: "crm", label: "CRM", icon: Users },
      { id: "reviews", label: "Reviews", icon: Star },
      { id: "reputation", label: "Reputation", icon: Award },
      { id: "gamification", label: "Level & Perks", icon: Trophy },
    ],
  },
  {
    label: "Money",
    items: [
      { id: "wallet", label: "Wallet & Payouts", icon: Wallet },
      { id: "billing", label: "Plans & Quotas", icon: CreditCard },
    ],
  },
];

// Onboarding isn't a nav destination, but the topbar still needs a title for it.
const ONBOARDING_GROUP: AppShellNavGroup<StudentDashboardTab> = {
  label: "Getting started",
  items: [{ id: "onboarding", label: "Launch your store", icon: Sparkles }],
};

export const StudentLayout: React.FC<StudentLayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  user,
  onLogout,
}) => {
  const groups = activeTab === "onboarding" ? [ONBOARDING_GROUP, ...NAV_GROUPS] : NAV_GROUPS;

  return (
    <AppShell
      brand={{
        name: "WIN Freelancer",
        tagline: "Reseller Business Portal",
        mark: <WinIcon className="h-9 w-9 shrink-0 drop-shadow-sm" />,
      }}
      groups={groups}
      activeId={activeTab}
      onNavigate={setActiveTab}
      user={{ name: user?.fullName || "Student Reseller", email: user?.email, role: "RESELLER" }}
      onLogout={onLogout}
    >
      {children}
    </AppShell>
  );
};

import {
  Package,
  FolderTree,
  LogOut,
  Store,
  Shield,
  Truck,
  MessageSquare,
  Trophy,
  LayoutDashboard,
  Users,
  Banknote,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@repo/ui";

export type AdminDashboardTab =
  | "overview"
  | "fulfillment"
  | "catalog"
  | "categories"
  | "students"
  | "payouts"
  | "roles"
  | "reviews"
  | "challenges";

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab: AdminDashboardTab;
  setActiveTab: (tab: AdminDashboardTab) => void;
  user: any;
  onLogout: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  user,
  onLogout,
}) => {
  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm">
            E
          </div>
          <div>
            <h1 className="font-semibold text-sm leading-tight">Institute Portal</h1>
            <p className="text-xs text-slate-400">Master Operations</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "overview"
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Executive Overview
          </button>

          <button
            onClick={() => setActiveTab("fulfillment")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "fulfillment"
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Truck className="h-4 w-4" />
            Order Fulfillment
          </button>

          <button
            onClick={() => setActiveTab("catalog")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "catalog"
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Package className="h-4 w-4" />
            Master Catalog
          </button>

          <button
            onClick={() => setActiveTab("categories")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "categories"
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <FolderTree className="h-4 w-4" />
            Categories
          </button>

          <button
            onClick={() => setActiveTab("students")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "students"
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Users className="h-4 w-4" />
            Students & Sellers
          </button>

          <button
            onClick={() => setActiveTab("payouts")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "payouts"
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Banknote className="h-4 w-4" />
            Payouts & Settlement
          </button>

          <button
            onClick={() => setActiveTab("roles")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "roles"
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            Roles & RBAC
          </button>

          <button
            onClick={() => setActiveTab("reviews")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "reviews"
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            Review Moderation
          </button>

          <button
            onClick={() => setActiveTab("challenges")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "challenges"
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Trophy className="h-4 w-4" />
            Milestones & XP
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-semibold text-blue-400 border border-slate-700">
              {user?.fullName?.charAt(0) || "A"}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold truncate text-white">
                {user?.fullName || "Administrator"}
              </p>
              <div className="flex items-center gap-1">
                <Shield className="h-3 w-3 text-emerald-400" />
                <span className="text-[10px] text-slate-400 font-mono">
                  {user?.role || "ADMIN"}
                </span>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="w-full text-slate-400 hover:text-red-400 hover:bg-slate-800 justify-start gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-slate-400" />
            <span className="text-sm font-medium text-slate-600">
              Commercial Reseller Training Platform
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              System Online
            </span>
          </div>
        </header>

        <div className="p-8 flex-1">{children}</div>
      </main>
    </div>
  );
};

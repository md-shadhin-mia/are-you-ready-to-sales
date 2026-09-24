import React from "react";
import {
  ShoppingBag,
  Sparkles,
  LogOut,
  Compass,
  Store,
  Box,
  Truck,
  Users,
} from "lucide-react";
import { Button } from "@repo/ui";

export type StudentDashboardTab =
  | "marketplace"
  | "store-builder"
  | "my-products"
  | "orders"
  | "crm"
  | "onboarding";

interface StudentLayoutProps {
  children: React.ReactNode;
  activeTab: StudentDashboardTab;
  setActiveTab: (tab: StudentDashboardTab) => void;
  user: any;
  onLogout: () => void;
}

export const StudentLayout: React.FC<StudentLayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  user,
  onLogout,
}) => {
  const navItems: Array<{
    id: StudentDashboardTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: "store-builder", label: "Store Builder", icon: Store },
    { id: "my-products", label: "My Products", icon: Box },
    { id: "marketplace", label: "Wholesale Catalog", icon: Compass },
    { id: "orders", label: "Orders & Profits", icon: Truck },
    { id: "crm", label: "Customer CRM", icon: Users },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Navbar */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-sm">
              S
            </div>
            <div>
              <h1 className="font-bold text-sm text-slate-900 leading-tight">
                Student Reseller Portal
              </h1>
              <p className="text-[11px] text-slate-500">Commercial Training Platform</p>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === item.id
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-900">
              {user?.fullName || "Student Reseller"}
            </p>
            <p className="text-[11px] text-slate-500">{user?.email}</p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="text-slate-500 hover:text-red-600 gap-1.5 text-xs"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Mobile Navigation Bar */}
      <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-1 overflow-x-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === item.id
                ? "bg-blue-50 text-blue-700 border border-blue-200"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
        {children}
      </main>
    </div>
  );
};

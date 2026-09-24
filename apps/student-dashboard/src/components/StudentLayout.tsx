import React from "react";
import { ShoppingBag, Sparkles, LogOut, Compass } from "lucide-react";
import { Button } from "@repo/ui";

interface StudentLayoutProps {
  children: React.ReactNode;
  activeTab: "marketplace" | "onboarding";
  setActiveTab: (tab: "marketplace" | "onboarding") => void;
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
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Navbar */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-linear-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-sm">
              S
            </div>
            <div>
              <h1 className="font-bold text-sm text-slate-900 leading-tight">
                Student Reseller Portal
              </h1>
              <p className="text-[11px] text-slate-500">Commercial Training Platform</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setActiveTab("marketplace")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === "marketplace"
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Compass className="h-4 w-4" />
              Institute Marketplace
            </button>

            <button
              onClick={() => setActiveTab("onboarding")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === "onboarding"
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Sparkles className="h-4 w-4 text-amber-500" />
              Store Setup Wizard
            </button>
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

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
        {children}
      </main>
    </div>
  );
};

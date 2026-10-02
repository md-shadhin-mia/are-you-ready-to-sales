import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  Building2,
  GraduationCap,
  Boxes,
  Store,
  Banknote,
  Package,
  FolderTree,
  MessageSquare,
  Trophy,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Bell,
  LogOut,
  Menu,
  X,
  Truck,
  RefreshCw,
  CreditCard,
  PackagePlus,
  Warehouse,
  BarChart3,
  Building,
  Settings,
  Info,
  UserCheck,
  Image,
  HelpCircle,
  Clock,
  Sparkles,
  CalendarRange,
} from "lucide-react";
import { Badge, Button } from "@repo/ui";
import { WinLogo } from "./WinLogo";
import { apiClient } from "@repo/api-client";

export type AdminDashboardTab =
  | "overview"
  // 1. Students
  | "students_pending"
  | "students_registered"
  | "students_cancelled"
  | "students_profit_payment"
  | "students"
  | "students_kyc"
  | "students_records"
  | "students_restrictions"
  // 2. Branches
  | "branches"
  // 3. Student Batches
  | "batches"
  // 4. Orders
  | "orders_overview"
  | "orders_all"
  | "orders_new"
  | "orders_complete"
  | "orders_partial"
  | "orders_unmatch"
  | "orders_invoiced"
  | "orders_hold"
  | "orders_cancelled"
  // 5. In Courier
  | "in_courier"
  | "orders_courier"
  // 6. Exchange Orders
  | "exchange_overview"
  | "exchange_all"
  | "orders_exchange"
  | "exchange_new"
  | "exchange_complete"
  | "exchange_invoiced"
  | "exchange_hold"
  | "exchange_cancelled"
  | "exchange_courier"
  // 7. Seller Panel
  | "sellers_overview"
  | "sellers_list"
  | "sellers_adjustment"
  | "sellers_support_tickets"
  | "sellers_active"
  | "sellers"
  // 8. Payments
  | "payments_requests"
  | "payments_paid"
  | "payments_methods"
  | "payouts"
  // 9. Purchases
  | "purchases_add"
  | "purchases_manage"
  | "purchases_po_add"
  | "purchases_po_manage"
  | "purchases_returns"
  | "purchases_return_types"
  // 10. Products
  | "products_catalog"
  | "products_categories"
  | "products_subcategories"
  | "products_sizes"
  | "products_colors"
  | "products_brands"
  | "catalog"
  | "categories"
  // 11. Inventory
  | "inventory_stock"
  | "inventory_ledger"
  | "inventory_adjustments"
  // 12. Reports
  | "reports_courier_status"
  | "reports_supplier_products"
  | "reports_supplier_profit"
  // 13. Wholesale
  | "wholesale_create"
  | "wholesale_manage"
  | "wholesale_product_report"
  // 14. Suppliers
  | "suppliers"
  // 15. Site Settings
  | "settings_general"
  | "settings_pages"
  // 16. About Us
  | "about_us"
  // 17. Employees
  | "employees_list"
  | "employees_add"
  | "employees_commissions"
  | "employees_penalties"
  | "employees_salary"
  // 18. Banner
  | "banner"
  // 19. Faq
  | "faq"
  // Platform & Governance
  | "reviews"
  | "challenges"
  | "roles";

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
  // Accordion state
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    students: true,
    orders: false,
    exchange: false,
    sellers: false,
    payments: false,
    purchases: false,
    products: false,
    inventory: false,
    reports: false,
    wholesale: false,
    settings: false,
    employees: false,
  });

  const toggleSection = (section: string) => {
    setExpanded((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const [mobileOpen, setMobileOpen] = useState(false);

  // Dynamic live badges
  const [alertBubbleCount, setAlertBubbleCount] = useState<number>(1);
  const [pendingPayoutsCount, setPendingPayoutsCount] = useState<number>(3);
  const [orderCounts, setOrderCounts] = useState({
    all: 9410,
    new: 8,
    complete: 0,
    partialDelivered: 233,
    unmatch: 4035,
    invoiced: 8778,
    hold: 29,
    cancelled: 131,
    inCourier: 9243,
    exchange: 14,
  });

  const token = localStorage.getItem("admin_token") || "";

  useEffect(() => {
    if (token) {
      apiClient.adminDashboard
        .getAlerts(token)
        .then((res) => {
          if (res?.urgentAlertsCount !== undefined) {
            setAlertBubbleCount(res.urgentAlertsCount);
          }
        })
        .catch(() => {});

      apiClient.orders
        .getCounts(token)
        .then((counts) => {
          if (counts && counts.all > 0) {
            setOrderCounts(counts);
          }
        })
        .catch(() => {});

      apiClient.finance
        .getAdminPayouts({ status: "PENDING" }, token)
        .then((res: any) => {
          if (res?.pendingCount !== undefined) {
            setPendingPayoutsCount(res.pendingCount);
          }
        })
        .catch(() => {});
    }
  }, [token]);

  // Keep parent accordion open if child is active
  useEffect(() => {
    if (activeTab.startsWith("students_") || activeTab === "students") {
      setExpanded((prev) => ({ ...prev, students: true }));
    } else if (activeTab.startsWith("orders_")) {
      setExpanded((prev) => ({ ...prev, orders: true }));
    } else if (activeTab.startsWith("exchange_")) {
      setExpanded((prev) => ({ ...prev, exchange: true }));
    } else if (activeTab.startsWith("sellers_") || activeTab === "sellers") {
      setExpanded((prev) => ({ ...prev, sellers: true }));
    } else if (activeTab.startsWith("payments_") || activeTab === "payouts") {
      setExpanded((prev) => ({ ...prev, payments: true }));
    } else if (activeTab.startsWith("purchases_")) {
      setExpanded((prev) => ({ ...prev, purchases: true }));
    } else if (
      activeTab.startsWith("products_") ||
      activeTab === "catalog" ||
      activeTab === "categories"
    ) {
      setExpanded((prev) => ({ ...prev, products: true }));
    } else if (activeTab.startsWith("inventory_")) {
      setExpanded((prev) => ({ ...prev, inventory: true }));
    } else if (activeTab.startsWith("reports_")) {
      setExpanded((prev) => ({ ...prev, reports: true }));
    } else if (activeTab.startsWith("wholesale_")) {
      setExpanded((prev) => ({ ...prev, wholesale: true }));
    } else if (activeTab.startsWith("settings_")) {
      setExpanded((prev) => ({ ...prev, settings: true }));
    } else if (activeTab.startsWith("employees_")) {
      setExpanded((prev) => ({ ...prev, employees: true }));
    }
  }, [activeTab]);

  const handleNavigate = (tab: AdminDashboardTab) => {
    setActiveTab(tab);
    setMobileOpen(false);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Persistent Navigation Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-5">
          <WinLogo theme="dark" />
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-md lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items (Scrollable Tree) */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3 text-xs font-medium custom-scrollbar">
          {/* Executive Dashboard */}
          <button
            onClick={() => handleNavigate("overview")}
            className={`group relative flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 transition-colors ${
              activeTab === "overview"
                ? "bg-[#0052FF] text-white shadow-xs font-semibold rounded-lg"
                : "text-slate-300 hover:bg-white/5 hover:text-white font-medium rounded-lg"
            }`}
          >
            <div className="flex items-center gap-3">
              
              <LayoutDashboard
                className={`h-4 w-4 shrink-0 ${
                  activeTab === "overview"
                    ? "text-white"
                    : "text-slate-400 group-hover:text-white"
                }`}
              />
              <span className="truncate">Dashboard</span>
            </div>
            
          </button>

          {/* 1. Students (Accordion) */}
          <div>
            <button
              onClick={() => toggleSection("students")}
              className={`group flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 transition-colors ${
                activeTab.startsWith("students_") || activeTab === "students"
                  ? "text-white bg-white/10 font-medium rounded-lg"
                  : "text-slate-300 hover:bg-white/5 hover:text-white font-medium rounded-lg"
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-white" />
                <span className="truncate font-semibold">Students</span>
              </div>
              {expanded.students ? (
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              )}
            </button>

            {expanded.students && (
              <div className="ml-7 mt-1 space-y-0.5 border-l border-sidebar-border/60 pl-2">
                {[
                  { id: "students_pending", label: "Pending Students", countBadge: 12 },
                  { id: "students_registered", label: "Registered Students" },
                  { id: "students_cancelled", label: "Cancel Students" },
                  { id: "students_profit_payment", label: "Students Profit Payment" },
                ].map((sub) => {
                  const active =
                    activeTab === sub.id ||
                    (sub.id === "students_registered" && activeTab === "students") ||
                    (sub.id === "students_pending" && activeTab === "students_kyc") ||
                    (sub.id === "students_cancelled" && activeTab === "students_restrictions");
                  return (
                    <button
                      key={sub.id}
                      onClick={() => handleNavigate(sub.id as AdminDashboardTab)}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-[11px] transition-colors ${
                        active
                          ? "bg-[#0052FF] font-semibold text-white shadow-2xs rounded-md"
                          : "text-slate-400 hover:text-white hover:bg-white/5 rounded-md"
                      }`}
                    >
                      <span className="truncate">{sub.label}</span>
                      {(sub as any).countBadge ? (
                        <span className="flex h-5 items-center justify-center rounded-full bg-[#0052FF] px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                          {(sub as any).countBadge}
                        </span>
                      ) : (sub as any).badge ? (
                        <span className="rounded-sm bg-amber-500/20 px-1 py-0.2 text-[9px] font-mono font-semibold text-amber-400">
                          {(sub as any).badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Branches (Single Menu) */}
          <button
            onClick={() => handleNavigate("branches")}
            className={`group relative flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors ${
              activeTab === "branches"
                ? "bg-[#0052FF] text-white shadow-xs font-semibold rounded-lg"
                : "text-slate-300 hover:bg-white/5 hover:text-white font-medium rounded-lg"
            }`}
          >
            
            <Building2
              className={`h-4 w-4 shrink-0 ${
                activeTab === "branches"
                  ? "text-white"
                  : "text-slate-400 group-hover:text-white"
              }`}
            />
            <span className="truncate">Branches</span>
          </button>

          {/* 3. Student Batches (Single Menu) */}
          <button
            onClick={() => handleNavigate("batches")}
            className={`group relative flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors ${
              activeTab === "batches"
                ? "bg-[#0052FF] text-white shadow-xs font-semibold rounded-lg"
                : "text-slate-300 hover:bg-white/5 hover:text-white font-medium rounded-lg"
            }`}
          >
            
            <CalendarRange
              className={`h-4 w-4 shrink-0 ${
                activeTab === "batches"
                  ? "text-white"
                  : "text-slate-400 group-hover:text-white"
              }`}
            />
            <span className="truncate">Student Batches</span>
          </button>

          {/* 4. Orders (Accordion) */}
          <div>
            <button
              onClick={() => toggleSection("orders")}
              className={`group flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 transition-colors ${
                activeTab.startsWith("orders_")
                  ? "text-white bg-white/10 font-medium rounded-lg"
                  : "text-slate-300 hover:bg-white/5 hover:text-white font-medium rounded-lg"
              }`}
            >
              <div className="flex items-center gap-3">
                <Boxes className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-white" />
                <span className="truncate font-semibold">Orders</span>
              </div>
              {expanded.orders ? (
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              )}
            </button>

            {expanded.orders && (
              <div className="ml-7 mt-1 space-y-0.5 border-l border-sidebar-border/60 pl-2">
                {[
                  { id: "orders_overview", label: "Order Overview" },
                  { id: "orders_all", label: "All Orders", count: orderCounts.all },
                  { id: "orders_new", label: "New Orders", count: orderCounts.new, color: "blue" },
                  { id: "orders_complete", label: "Complete Orders", count: orderCounts.complete },
                  { id: "orders_partial", label: "Partial Delivered", count: orderCounts.partialDelivered },
                  { id: "orders_unmatch", label: "Unmatch Orders", count: orderCounts.unmatch, color: "warning" },
                  { id: "orders_invoiced", label: "Invoiced Orders", count: orderCounts.invoiced },
                  { id: "orders_hold", label: "Hold Orders", count: orderCounts.hold, color: "destructive" },
                  { id: "orders_cancelled", label: "Cancelled Orders", count: orderCounts.cancelled },
                ].map((sub) => {
                  const active = activeTab === sub.id;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => handleNavigate(sub.id as AdminDashboardTab)}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                        active
                          ? "bg-sidebar-accent/70 font-semibold text-white"
                          : "text-slate-400 hover:text-white hover:bg-white/5 rounded-md"
                      }`}
                    >
                      <span className="truncate">{sub.label}</span>
                      {sub.count !== undefined && (
                        <span
                          className={`ml-1.5 rounded-full px-1.5 py-0.2 font-mono text-[10px] font-bold ${
                            sub.color === "blue"
                              ? "bg-blue-600 text-white"
                              : sub.color === "destructive"
                                ? "bg-red-600 text-white"
                                : sub.color === "warning"
                                  ? "bg-amber-600 text-white"
                                  : "bg-sidebar-border text-slate-400"
                          }`}
                        >
                          {sub.count.toLocaleString()}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 5. In Courier (Single Menu) */}
          <button
            onClick={() => handleNavigate("in_courier")}
            className={`group relative flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 transition-colors ${
              activeTab === "in_courier" || activeTab === "orders_courier"
                ? "bg-[#0052FF] text-white shadow-xs font-semibold rounded-lg"
                : "text-slate-300 hover:bg-white/5 hover:text-white font-medium rounded-lg"
            }`}
          >
            <div className="flex items-center gap-3">
              
              <Truck
                className={`h-4 w-4 shrink-0 ${
                  activeTab === "in_courier" || activeTab === "orders_courier"
                    ? "text-white"
                    : "text-slate-400 group-hover:text-white"
                }`}
              />
              <span className="truncate">In Courier</span>
            </div>
            <span className="flex h-5 items-center justify-center rounded-full bg-[#0052FF] px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">3</span>
          </button>

          {/* 6. Exchange Orders (Accordion) */}
          <div>
            <button
              onClick={() => toggleSection("exchange")}
              className={`group flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 transition-colors ${
                activeTab.startsWith("exchange_") || activeTab === "orders_exchange"
                  ? "text-white bg-white/10 font-medium rounded-lg"
                  : "text-slate-300 hover:bg-white/5 hover:text-white font-medium rounded-lg"
              }`}
            >
              <div className="flex items-center gap-3">
                <RefreshCw className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-white" />
                <span className="truncate font-semibold">Exchange Orders</span>
              </div>
              {expanded.exchange ? (
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              )}
            </button>

            {expanded.exchange && (
              <div className="ml-7 mt-1 space-y-0.5 border-l border-sidebar-border/60 pl-2">
                {[
                  { id: "exchange_overview", label: "Exchange Overview" },
                  { id: "exchange_all", label: "All Exchange Orders", count: orderCounts.exchange },
                  { id: "exchange_new", label: "New Exchange Orders" },
                  { id: "exchange_complete", label: "Complete Exchange Orders" },
                  { id: "exchange_invoiced", label: "Invoiced Exchange Orders" },
                  { id: "exchange_hold", label: "Hold Exchange Orders" },
                  { id: "exchange_cancelled", label: "Cancelled Exchange Orders" },
                  { id: "exchange_courier", label: "Exchange In Courier" },
                ].map((sub) => {
                  const active =
                    activeTab === sub.id ||
                    (sub.id === "exchange_all" && activeTab === "orders_exchange");
                  return (
                    <button
                      key={sub.id}
                      onClick={() => handleNavigate(sub.id as AdminDashboardTab)}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                        active
                          ? "bg-[#0052FF] font-semibold text-white shadow-2xs rounded-md"
                          : "text-slate-400 hover:text-white hover:bg-white/5 rounded-md"
                      }`}
                    >
                      <span className="truncate">{sub.label}</span>
                      {sub.count !== undefined && (
                        <span className="rounded-full bg-sidebar-border px-1.5 py-0.2 font-mono text-[10px] font-bold text-slate-400">
                          {sub.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 7. Seller Panel (Accordion) */}
          <div>
            <button
              onClick={() => toggleSection("sellers")}
              className={`group flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 transition-colors ${
                activeTab.startsWith("sellers_") || activeTab === "sellers"
                  ? "text-white bg-white/10 font-medium rounded-lg"
                  : "text-slate-300 hover:bg-white/5 hover:text-white font-medium rounded-lg"
              }`}
            >
              <div className="flex items-center gap-3">
                <Store className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-white" />
                <span className="truncate font-semibold">Seller Panel</span>
              </div>
              {expanded.sellers ? (
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              )}
            </button>

            {expanded.sellers && (
              <div className="ml-7 mt-1 space-y-0.5 border-l border-sidebar-border/60 pl-2">
                {[
                  { id: "sellers_overview", label: "Overview" },
                  { id: "sellers_list", label: "Seller List" },
                  { id: "sellers_adjustment", label: "Seller Adjustment" },
                  { id: "sellers_support_tickets", label: "Support Tickets" },
                  { id: "sellers_active", label: "Active Seller" },
                ].map((sub) => {
                  const active =
                    activeTab === sub.id ||
                    (sub.id === "sellers_list" && activeTab === "sellers");
                  return (
                    <button
                      key={sub.id}
                      onClick={() => handleNavigate(sub.id as AdminDashboardTab)}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                        active
                          ? "bg-[#0052FF] font-semibold text-white shadow-2xs rounded-md"
                          : "text-slate-400 hover:text-white hover:bg-white/5 rounded-md"
                      }`}
                    >
                      <span className="truncate">{sub.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 8. Payments (Accordion) */}
          <div>
            <button
              onClick={() => toggleSection("payments")}
              className={`group flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 transition-colors ${
                activeTab.startsWith("payments_") || activeTab === "payouts"
                  ? "text-white bg-white/10 font-medium rounded-lg"
                  : "text-slate-300 hover:bg-white/5 hover:text-white font-medium rounded-lg"
              }`}
            >
              <div className="flex items-center gap-3">
                <Banknote className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-white" />
                <span className="truncate font-semibold">Payments</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex h-5 items-center justify-center rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-slate-950 shadow-xs">5</span>
                {expanded.payments ? (
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                )}
              </div>
            </button>

            {expanded.payments && (
              <div className="ml-7 mt-1 space-y-0.5 border-l border-sidebar-border/60 pl-2">
                {[
                  { id: "payments_requests", label: "Payment Requests", count: pendingPayoutsCount },
                  { id: "payments_paid", label: "Payment Paid" },
                  { id: "payments_methods", label: "Payment Methods" },
                ].map((sub) => {
                  const active =
                    activeTab === sub.id ||
                    (sub.id === "payments_requests" && activeTab === "payouts");
                  return (
                    <button
                      key={sub.id}
                      onClick={() => handleNavigate(sub.id as AdminDashboardTab)}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                        active
                          ? "bg-[#0052FF] font-semibold text-white shadow-2xs rounded-md"
                          : "text-slate-400 hover:text-white hover:bg-white/5 rounded-md"
                      }`}
                    >
                      <span className="truncate">{sub.label}</span>
                      {sub.count !== undefined && (
                        <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 font-mono text-[9px] font-bold text-amber-400">
                          {sub.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 9. Purchases (Accordion) */}
          <div>
            <button
              onClick={() => toggleSection("purchases")}
              className={`group flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 transition-colors ${
                activeTab.startsWith("purchases_")
                  ? "text-white bg-white/10 font-medium rounded-lg"
                  : "text-slate-300 hover:bg-white/5 hover:text-white font-medium rounded-lg"
              }`}
            >
              <div className="flex items-center gap-3">
                <PackagePlus className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-white" />
                <span className="truncate font-semibold">Purchases</span>
              </div>
              {expanded.purchases ? (
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              )}
            </button>

            {expanded.purchases && (
              <div className="ml-7 mt-1 space-y-0.5 border-l border-sidebar-border/60 pl-2">
                {[
                  { id: "purchases_add", label: "Add Purchase" },
                  { id: "purchases_manage", label: "Manage Purchase" },
                  { id: "purchases_po_add", label: "Add Purchase Order" },
                  { id: "purchases_po_manage", label: "Manage Purchase Order" },
                  { id: "purchases_returns", label: "Purchase Return List" },
                  { id: "purchases_return_types", label: "Purchase Return Type" },
                ].map((sub) => {
                  const active = activeTab === sub.id;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => handleNavigate(sub.id as AdminDashboardTab)}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                        active
                          ? "bg-[#0052FF] font-semibold text-white shadow-2xs rounded-md"
                          : "text-slate-400 hover:text-white hover:bg-white/5 rounded-md"
                      }`}
                    >
                      <span className="truncate">{sub.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 10. Products (Accordion) */}
          <div>
            <button
              onClick={() => toggleSection("products")}
              className={`group flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 transition-colors ${
                activeTab.startsWith("products_") ||
                activeTab === "catalog" ||
                activeTab === "categories"
                  ? "text-white bg-white/10 font-medium rounded-lg"
                  : "text-slate-300 hover:bg-white/5 hover:text-white font-medium rounded-lg"
              }`}
            >
              <div className="flex items-center gap-3">
                <Package className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-white" />
                <span className="truncate font-semibold">Products</span>
              </div>
              {expanded.products ? (
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              )}
            </button>

            {expanded.products && (
              <div className="ml-7 mt-1 space-y-0.5 border-l border-sidebar-border/60 pl-2">
                {[
                  { id: "products_catalog", label: "Product" },
                  { id: "products_categories", label: "Categories" },
                  { id: "products_subcategories", label: "Subcategories" },
                  { id: "products_sizes", label: "Sizes" },
                  { id: "products_colors", label: "Colors" },
                  { id: "products_brands", label: "Brands" },
                ].map((sub) => {
                  const active =
                    activeTab === sub.id ||
                    (sub.id === "products_catalog" && activeTab === "catalog") ||
                    (sub.id === "products_categories" && activeTab === "categories");
                  return (
                    <button
                      key={sub.id}
                      onClick={() => handleNavigate(sub.id as AdminDashboardTab)}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                        active
                          ? "bg-[#0052FF] font-semibold text-white shadow-2xs rounded-md"
                          : "text-slate-400 hover:text-white hover:bg-white/5 rounded-md"
                      }`}
                    >
                      <span className="truncate">{sub.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 11. Inventory (Accordion) */}
          <div>
            <button
              onClick={() => toggleSection("inventory")}
              className={`group flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 transition-colors ${
                activeTab.startsWith("inventory_")
                  ? "text-white bg-white/10 font-medium rounded-lg"
                  : "text-slate-300 hover:bg-white/5 hover:text-white font-medium rounded-lg"
              }`}
            >
              <div className="flex items-center gap-3">
                <Warehouse className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-white" />
                <span className="truncate font-semibold">Inventory</span>
              </div>
              {expanded.inventory ? (
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              )}
            </button>

            {expanded.inventory && (
              <div className="ml-7 mt-1 space-y-0.5 border-l border-sidebar-border/60 pl-2">
                {[
                  { id: "inventory_stock", label: "Stock" },
                  { id: "inventory_ledger", label: "Ledger" },
                  { id: "inventory_adjustments", label: "Adjustments" },
                ].map((sub) => {
                  const active = activeTab === sub.id;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => handleNavigate(sub.id as AdminDashboardTab)}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                        active
                          ? "bg-[#0052FF] font-semibold text-white shadow-2xs rounded-md"
                          : "text-slate-400 hover:text-white hover:bg-white/5 rounded-md"
                      }`}
                    >
                      <span className="truncate">{sub.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 12. Reports (Accordion) */}
          <div>
            <button
              onClick={() => toggleSection("reports")}
              className={`group flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 transition-colors ${
                activeTab.startsWith("reports_")
                  ? "text-white bg-white/10 font-medium rounded-lg"
                  : "text-slate-300 hover:bg-white/5 hover:text-white font-medium rounded-lg"
              }`}
            >
              <div className="flex items-center gap-3">
                <BarChart3 className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-white" />
                <span className="truncate font-semibold">Reports</span>
              </div>
              {expanded.reports ? (
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              )}
            </button>

            {expanded.reports && (
              <div className="ml-7 mt-1 space-y-0.5 border-l border-sidebar-border/60 pl-2">
                {[
                  { id: "reports_courier_status", label: "Product Courier Status" },
                  { id: "reports_supplier_products", label: "Supplier Product Report" },
                  { id: "reports_supplier_profit", label: "Supplier Profit Lifecycle" },
                ].map((sub) => {
                  const active = activeTab === sub.id;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => handleNavigate(sub.id as AdminDashboardTab)}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                        active
                          ? "bg-[#0052FF] font-semibold text-white shadow-2xs rounded-md"
                          : "text-slate-400 hover:text-white hover:bg-white/5 rounded-md"
                      }`}
                    >
                      <span className="truncate">{sub.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 13. Wholesale (Accordion) */}
          <div>
            <button
              onClick={() => toggleSection("wholesale")}
              className={`group flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 transition-colors ${
                activeTab.startsWith("wholesale_")
                  ? "text-white bg-white/10 font-medium rounded-lg"
                  : "text-slate-300 hover:bg-white/5 hover:text-white font-medium rounded-lg"
              }`}
            >
              <div className="flex items-center gap-3">
                <Building className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-white" />
                <span className="truncate font-semibold">Wholesale</span>
              </div>
              {expanded.wholesale ? (
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              )}
            </button>

            {expanded.wholesale && (
              <div className="ml-7 mt-1 space-y-0.5 border-l border-sidebar-border/60 pl-2">
                {[
                  { id: "wholesale_create", label: "Create Wholesale" },
                  { id: "wholesale_manage", label: "Manage Wholesale" },
                  { id: "wholesale_product_report", label: "Product Wise Report" },
                ].map((sub) => {
                  const active = activeTab === sub.id;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => handleNavigate(sub.id as AdminDashboardTab)}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                        active
                          ? "bg-[#0052FF] font-semibold text-white shadow-2xs rounded-md"
                          : "text-slate-400 hover:text-white hover:bg-white/5 rounded-md"
                      }`}
                    >
                      <span className="truncate">{sub.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 14. Suppliers (Single Menu) */}
          <button
            onClick={() => handleNavigate("suppliers")}
            className={`group relative flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors ${
              activeTab === "suppliers"
                ? "bg-[#0052FF] text-white shadow-xs font-semibold rounded-lg"
                : "text-slate-300 hover:bg-white/5 hover:text-white font-medium rounded-lg"
            }`}
          >
            
            <Building
              className={`h-4 w-4 shrink-0 ${
                activeTab === "suppliers"
                  ? "text-white"
                  : "text-slate-400 group-hover:text-white"
              }`}
            />
            <span className="truncate">Suppliers</span>
          </button>

          {/* 15. Site Settings (Accordion) */}
          <div>
            <button
              onClick={() => toggleSection("settings")}
              className={`group flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 transition-colors ${
                activeTab.startsWith("settings_")
                  ? "text-white bg-white/10 font-medium rounded-lg"
                  : "text-slate-300 hover:bg-white/5 hover:text-white font-medium rounded-lg"
              }`}
            >
              <div className="flex items-center gap-3">
                <Settings className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-white" />
                <span className="truncate font-semibold">Site Settings</span>
              </div>
              {expanded.settings ? (
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              )}
            </button>

            {expanded.settings && (
              <div className="ml-7 mt-1 space-y-0.5 border-l border-sidebar-border/60 pl-2">
                {[
                  { id: "settings_general", label: "General Setting" },
                  { id: "settings_pages", label: "Manage Page" },
                ].map((sub) => {
                  const active = activeTab === sub.id;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => handleNavigate(sub.id as AdminDashboardTab)}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                        active
                          ? "bg-[#0052FF] font-semibold text-white shadow-2xs rounded-md"
                          : "text-slate-400 hover:text-white hover:bg-white/5 rounded-md"
                      }`}
                    >
                      <span className="truncate">{sub.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 16. About Us (Single Menu) */}
          <button
            onClick={() => handleNavigate("about_us")}
            className={`group relative flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors ${
              activeTab === "about_us"
                ? "bg-[#0052FF] text-white shadow-xs font-semibold rounded-lg"
                : "text-slate-300 hover:bg-white/5 hover:text-white font-medium rounded-lg"
            }`}
          >
            
            <Info
              className={`h-4 w-4 shrink-0 ${
                activeTab === "about_us"
                  ? "text-white"
                  : "text-slate-400 group-hover:text-white"
              }`}
            />
            <span className="truncate">About Us</span>
          </button>

          {/* 17. Employees (Accordion) */}
          <div>
            <button
              onClick={() => toggleSection("employees")}
              className={`group flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 transition-colors ${
                activeTab.startsWith("employees_")
                  ? "text-white bg-white/10 font-medium rounded-lg"
                  : "text-slate-300 hover:bg-white/5 hover:text-white font-medium rounded-lg"
              }`}
            >
              <div className="flex items-center gap-3">
                <UserCheck className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-white" />
                <span className="truncate font-semibold">Employees</span>
              </div>
              {expanded.employees ? (
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              )}
            </button>

            {expanded.employees && (
              <div className="ml-7 mt-1 space-y-0.5 border-l border-sidebar-border/60 pl-2">
                {[
                  { id: "employees_list", label: "Employee List" },
                  { id: "employees_add", label: "Add Employee" },
                  { id: "employees_commissions", label: "Lead Commissions" },
                  { id: "employees_penalties", label: "Fines / Penalties" },
                  { id: "employees_salary", label: "Salary Sheet" },
                ].map((sub) => {
                  const active = activeTab === sub.id;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => handleNavigate(sub.id as AdminDashboardTab)}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                        active
                          ? "bg-[#0052FF] font-semibold text-white shadow-2xs rounded-md"
                          : "text-slate-400 hover:text-white hover:bg-white/5 rounded-md"
                      }`}
                    >
                      <span className="truncate">{sub.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 18. Banner (Single Menu) */}
          <button
            onClick={() => handleNavigate("banner")}
            className={`group relative flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors ${
              activeTab === "banner"
                ? "bg-[#0052FF] text-white shadow-xs font-semibold rounded-lg"
                : "text-slate-300 hover:bg-white/5 hover:text-white font-medium rounded-lg"
            }`}
          >
            
            <Image
              className={`h-4 w-4 shrink-0 ${
                activeTab === "banner"
                  ? "text-white"
                  : "text-slate-400 group-hover:text-white"
              }`}
            />
            <span className="truncate">Banner</span>
          </button>

          {/* 19. Faq (Single Menu) */}
          <button
            onClick={() => handleNavigate("faq")}
            className={`group relative flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors ${
              activeTab === "faq"
                ? "bg-[#0052FF] text-white shadow-xs font-semibold rounded-lg"
                : "text-slate-300 hover:bg-white/5 hover:text-white font-medium rounded-lg"
            }`}
          >
            
            <HelpCircle
              className={`h-4 w-4 shrink-0 ${
                activeTab === "faq"
                  ? "text-white"
                  : "text-slate-400 group-hover:text-white"
              }`}
            />
            <span className="truncate">Faq</span>
          </button>

          {/* Platform Governance Section */}
          <div className="pt-4 pb-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400/70">
              Platform & Governance
            </p>
          </div>

          <button
            onClick={() => handleNavigate("reviews")}
            className={`group flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-1.5 text-xs transition-colors ${
              activeTab === "reviews"
                ? "bg-[#0052FF] text-white shadow-xs font-semibold rounded-lg"
                : "text-slate-400 hover:text-white hover:bg-white/5 rounded-md"
            }`}
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            <span>Review Moderation</span>
          </button>

          <button
            onClick={() => handleNavigate("challenges")}
            className={`group flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-1.5 text-xs transition-colors ${
              activeTab === "challenges"
                ? "bg-[#0052FF] text-white shadow-xs font-semibold rounded-lg"
                : "text-slate-400 hover:text-white hover:bg-white/5 rounded-md"
            }`}
          >
            <Trophy className="h-4 w-4 shrink-0" />
            <span>Milestones & XP</span>
          </button>

          <button
            onClick={() => handleNavigate("roles")}
            className={`group flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-1.5 text-xs transition-colors ${
              activeTab === "roles"
                ? "bg-[#0052FF] text-white shadow-xs font-semibold rounded-lg"
                : "text-slate-400 hover:text-white hover:bg-white/5 rounded-md"
            }`}
          >
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>Roles & RBAC</span>
          </button>
        </nav>

        {/* User Footer */}
        <div className="shrink-0 border-t border-sidebar-border p-3">
          <div className="flex items-center justify-between rounded-lg bg-white/5 p-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-8 w-8 rounded-full bg-[#0052FF] text-white flex items-center justify-center font-bold text-xs shrink-0 select-none">
                SA
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">
                  {user?.fullName || "Platform Super Admin"}
                </p>
                <p className="truncate font-mono text-[10px] text-slate-400">
                  {user?.role || "SUPER_ADMIN"}
                </p>
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Sign out"
              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-white px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-1.5 text-muted-foreground hover:text-foreground lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-medium text-slate-600">
                Campus Scope:
              </span>
              <div className="relative">
                <select className="appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 py-1 text-xs font-medium text-slate-700 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="">All Campuses (Global View)</option>
                  <option value="dhk">Dhaka Main Campus</option>
                  <option value="ctg">Chittagong Regional Hub</option>
                  <option value="syl">Sylhet Digital Center</option>
                  <option value="online">Virtual / Online Campus</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1 text-xs font-medium text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Operations Live
            </div>

            {/* Notification alert bubble trigger in topbar */}
            <button
              onClick={() => handleNavigate("overview")}
              className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {alertBubbleCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-2xs">
                  {alertBubbleCount}
                </span>
              )}
            </button>

            {/* User Avatar Circle */}
            <div className="h-8 w-8 rounded-full bg-[#0E2046] text-white flex items-center justify-center font-bold text-xs select-none">
              SA
            </div>
          </div>
        </header>

        {/* Page Body Container */}
        <main className="flex-1 overflow-y-auto p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
};

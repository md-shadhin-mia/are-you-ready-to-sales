import React, { useState, useEffect } from "react";
import { LoginPage } from "./pages/auth/LoginPage";
import { AdminLayout, AdminDashboardTab } from "./components/AdminLayout";
import { MasterCatalogPage } from "./pages/catalog/MasterCatalogPage";
import { CategoriesPage } from "./pages/categories/CategoriesPage";
import { FulfillmentPage } from "./pages/fulfillment/FulfillmentPage";
import { AdminReviewsPage } from "./pages/reviews/AdminReviewsPage";
import { AdminChallengesPage } from "./pages/challenges/AdminChallengesPage";
import { ExecutiveOverviewPage } from "./pages/overview/ExecutiveOverviewPage";
import { StudentGovernancePage } from "./pages/students/StudentGovernancePage";
import { PayoutApprovalPage } from "./pages/payouts/PayoutApprovalPage";
import { RolesManagerPage } from "./pages/roles/RolesManagerPage";
import { BranchesPage } from "./pages/branches/BranchesPage";
import { BatchesPage } from "./pages/batches/BatchesPage";
import { SellerPanelPage } from "./pages/sellers/SellerPanelPage";
import { SupportTicketsView } from "./pages/sellers/SupportTicketsView";
import { ExchangeOrdersPage } from "./pages/exchanges/ExchangeOrdersPage";
import PaymentPaidPage from "./pages/payments/PaymentPaidPage";
import PaymentMethodsPage from "./pages/payments/PaymentMethodsPage";
import PurchasesPage from "./pages/purchases/PurchasesPage";
import PurchaseOrdersPage from "./pages/purchases/PurchaseOrdersPage";
import PurchaseReturnsPage from "./pages/purchases/PurchaseReturnsPage";
import TaxonomyPage from "./pages/taxonomy/TaxonomyPage";
import InventoryStockPage from "./pages/inventory/InventoryStockPage";
import ReportsDashboardPage from "./pages/reports/ReportsDashboardPage";
import WholesaleManagePage from "./pages/wholesale/WholesaleManagePage";
import SuppliersPage from "./pages/suppliers/SuppliersPage";
import CmsSettingsPage from "./pages/cms/CmsSettingsPage";
import ManagePagesPage from "./pages/cms/ManagePagesPage";
import AboutUsPage from "./pages/cms/AboutUsPage";
import EmployeesPage from "./pages/employees/EmployeesPage";
import EmployeeCommissionsPage from "./pages/employees/EmployeeCommissionsPage";
import EmployeePenaltiesPage from "./pages/employees/EmployeePenaltiesPage";
import SalarySheetPage from "./pages/employees/SalarySheetPage";
import BannersPage from "./pages/storefront/BannersPage";
import FaqsPage from "./pages/storefront/FaqsPage";
import { ComingSoonPage } from "./components/ComingSoonPage";
import { apiClient } from "@repo/api-client";

export function App() {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("admin_token"),
  );
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<AdminDashboardTab>("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      apiClient.auth
        .getProfile(token)
        .then((profile) => {
          setUser(profile);
        })
        .catch(() => {
          localStorage.removeItem("admin_token");
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const handleLoginSuccess = (loggedInUser: any, accessToken: string) => {
    localStorage.setItem("admin_token", accessToken);
    setToken(accessToken);
    setUser(loggedInUser);
    setActiveTab("overview");
  };

  const handleLogout = () => {
    if (token) {
      apiClient.auth.logout(token).catch(console.error);
    }
    localStorage.removeItem("admin_token");
    setToken(null);
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="text-sm font-medium text-slate-400">
            Initializing Session...
          </p>
        </div>
      </div>
    );
  }

  if (!token) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <AdminLayout
      user={user}
      onLogout={handleLogout}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    >
      {/* 0. Executive Dashboards */}
      {activeTab === "overview" && (
        <ExecutiveOverviewPage token={token} setActiveTab={setActiveTab} />
      )}

      {/* 1. Students Suite */}
      {(activeTab === "students" || activeTab === "students_registered") && (
        <StudentGovernancePage token={token} initialSubTab="directory" />
      )}
      {(activeTab === "students_pending" || activeTab === "students_kyc") && (
        <StudentGovernancePage token={token} initialSubTab="kyc" />
      )}
      {(activeTab === "students_cancelled" || activeTab === "students_restrictions") && (
        <StudentGovernancePage token={token} initialSubTab="restrictions" />
      )}
      {activeTab === "students_records" && (
        <StudentGovernancePage token={token} initialSubTab="records" />
      )}
      {activeTab === "students_profit_payment" && (
        <PayoutApprovalPage token={token} />
      )}

      {/* 2. Campus Branches */}
      {activeTab === "branches" && <BranchesPage token={token} />}

      {/* 3. Student Batches */}
      {activeTab === "batches" && <BatchesPage token={token} />}

      {/* 4. Orders Fulfillment Console (Queues) */}
      {activeTab === "orders_overview" && (
        <FulfillmentPage token={token} initialQueue="overview" />
      )}
      {activeTab === "orders_all" && (
        <FulfillmentPage token={token} initialQueue="all" />
      )}
      {activeTab === "orders_new" && (
        <FulfillmentPage token={token} initialQueue="new" />
      )}
      {activeTab === "orders_complete" && (
        <FulfillmentPage token={token} initialQueue="complete" />
      )}
      {activeTab === "orders_partial" && (
        <FulfillmentPage token={token} initialQueue="partial" />
      )}
      {activeTab === "orders_unmatch" && (
        <FulfillmentPage token={token} initialQueue="unmatch" />
      )}
      {activeTab === "orders_invoiced" && (
        <FulfillmentPage token={token} initialQueue="invoiced" />
      )}
      {activeTab === "orders_hold" && (
        <FulfillmentPage token={token} initialQueue="hold" />
      )}
      {activeTab === "orders_cancelled" && (
        <FulfillmentPage token={token} initialQueue="cancelled" />
      )}

      {/* 5. In Courier */}
      {(activeTab === "in_courier" || activeTab === "orders_courier") && (
        <FulfillmentPage token={token} initialQueue="in_courier" />
      )}

      {/* 6. Exchange Orders */}
      {(activeTab.startsWith("exchange_") || activeTab === "orders_exchange") && (
        <ExchangeOrdersPage
          token={token}
          initialQueue={activeTab === "orders_exchange" ? "all" : activeTab.replace("exchange_", "")}
        />
      )}

      {/* 7. Seller Panel */}
      {activeTab === "sellers_support_tickets" && (
        <SupportTicketsView token={token} />
      )}
      {(activeTab === "sellers" ||
        activeTab === "sellers_list" ||
        activeTab === "sellers_overview" ||
        activeTab === "sellers_adjustment" ||
        activeTab === "sellers_active") && <SellerPanelPage token={token} />}

      {/* 8. Payments */}
      {(activeTab === "payments_requests" || activeTab === "payouts") && (
        <PayoutApprovalPage token={token} />
      )}
      {activeTab === "payments_paid" && <PaymentPaidPage />}
      {activeTab === "payments_methods" && <PaymentMethodsPage />}

      {/* 9. Purchases */}
      {(activeTab === "purchases_add" || activeTab === "purchases_manage") && (
        <PurchasesPage />
      )}
      {(activeTab === "purchases_po_add" || activeTab === "purchases_po_manage") && (
        <PurchaseOrdersPage />
      )}
      {(activeTab === "purchases_returns" || activeTab === "purchases_return_types") && (
        <PurchaseReturnsPage />
      )}

      {/* 10. Products */}
      {(activeTab === "products_catalog" || activeTab === "catalog") && (
        <MasterCatalogPage token={token} />
      )}
      {(activeTab === "products_categories" || activeTab === "categories" || activeTab === "products_subcategories") && (
        <CategoriesPage token={token} />
      )}
      {activeTab === "products_brands" && <TaxonomyPage defaultTab="brands" />}
      {activeTab === "products_sizes" && <TaxonomyPage defaultTab="sizes" />}
      {activeTab === "products_colors" && <TaxonomyPage defaultTab="colors" />}

      {/* 11. Inventory */}
      {activeTab.startsWith("inventory_") && <InventoryStockPage />}

      {/* 12. Reports */}
      {activeTab === "reports_courier_status" && (
        <ReportsDashboardPage initialTab="courier" />
      )}
      {(activeTab === "reports_supplier_products" || activeTab === "reports_supplier_profit") && (
        <ReportsDashboardPage initialTab="supplier" />
      )}

      {/* 13. Wholesale */}
      {activeTab === "wholesale_create" && (
        <WholesaleManagePage openCreateOnMount={true} />
      )}
      {(activeTab === "wholesale_manage" || activeTab === "wholesale_product_report") && (
        <WholesaleManagePage />
      )}

      {/* 14. Suppliers */}
      {activeTab === "suppliers" && <SuppliersPage />}

      {/* 15. Site Settings */}
      {activeTab === "settings_general" && <CmsSettingsPage />}
      {activeTab === "settings_pages" && <ManagePagesPage />}

      {/* 16. About Us */}
      {activeTab === "about_us" && <AboutUsPage />}

      {/* 17. Employees */}
      {(activeTab === "employees_list" || activeTab === "employees_add") && (
        <EmployeesPage />
      )}
      {activeTab === "employees_commissions" && <EmployeeCommissionsPage />}
      {activeTab === "employees_penalties" && <EmployeePenaltiesPage />}
      {activeTab === "employees_salary" && <SalarySheetPage />}

      {/* 18. Banner */}
      {activeTab === "banner" && <BannersPage />}

      {/* 19. Faq */}
      {activeTab === "faq" && <FaqsPage />}

      {/* Platform Governance */}
      {activeTab === "reviews" && <AdminReviewsPage token={token} />}
      {activeTab === "challenges" && <AdminChallengesPage token={token} />}
      {activeTab === "roles" && <RolesManagerPage token={token} />}
    </AdminLayout>
  );
}

export default App;

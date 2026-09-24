import React, { useState, useEffect } from "react";
import { LoginPage } from "./pages/auth/LoginPage";
import { AdminLayout, AdminDashboardTab } from "./components/AdminLayout";
import { MasterCatalogPage } from "./pages/catalog/MasterCatalogPage";
import { CategoriesPage } from "./pages/categories/CategoriesPage";
import { FulfillmentPage } from "./pages/fulfillment/FulfillmentPage";
import { apiClient } from "@repo/api-client";

export function App() {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("admin_token"),
  );
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<AdminDashboardTab>("fulfillment");
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
    setActiveTab("fulfillment");
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        Loading Institute Portal...
      </div>
    );
  }

  if (!token) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <AdminLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      user={user}
      onLogout={handleLogout}
    >
      {activeTab === "fulfillment" && <FulfillmentPage token={token} />}
      {activeTab === "catalog" && <MasterCatalogPage token={token} />}
      {activeTab === "categories" && <CategoriesPage token={token} />}
    </AdminLayout>
  );
}

export default App;

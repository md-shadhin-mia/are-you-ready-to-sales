import React, { useState, useEffect } from "react";
import { StudentAuthPage } from "./pages/auth/StudentAuthPage";
import { StudentLayout, StudentDashboardTab } from "./components/StudentLayout";
import { MarketplacePage } from "./pages/marketplace/MarketplacePage";
import { OnboardingWizard } from "./pages/onboarding/OnboardingWizard";
import { StoreBuilderPage } from "./pages/store-builder/StoreBuilderPage";
import { MyProductsPage } from "./pages/my-products/MyProductsPage";
import { StudentOrdersPage } from "./pages/orders/StudentOrdersPage";
import { StudentCrmPage } from "./pages/crm/StudentCrmPage";
import { apiClient } from "@repo/api-client";

export function App() {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("student_token"),
  );
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<StudentDashboardTab>("store-builder");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      apiClient.auth
        .getProfile(token)
        .then((profile) => {
          setUser(profile);
          // If student has no stores, prompt onboarding wizard first
          if (!profile.stores || profile.stores.length === 0) {
            setActiveTab("onboarding");
          }
        })
        .catch(() => {
          localStorage.removeItem("student_token");
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const handleAuthSuccess = (loggedInUser: any, accessToken: string) => {
    localStorage.setItem("student_token", accessToken);
    setToken(accessToken);
    setUser(loggedInUser);
    setActiveTab("store-builder");
  };

  const handleLogout = () => {
    if (token) {
      apiClient.auth.logout(token).catch(console.error);
    }
    localStorage.removeItem("student_token");
    setToken(null);
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-sm">
        Loading Student Portal...
      </div>
    );
  }

  if (!token) {
    return <StudentAuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <StudentLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      user={user}
      onLogout={handleLogout}
    >
      {activeTab === "store-builder" && <StoreBuilderPage token={token} />}
      {activeTab === "my-products" && <MyProductsPage token={token} />}
      {activeTab === "marketplace" && <MarketplacePage token={token} />}
      {activeTab === "orders" && <StudentOrdersPage token={token} />}
      {activeTab === "crm" && <StudentCrmPage token={token} />}
      {activeTab === "onboarding" && (
        <OnboardingWizard
          user={user}
          token={token}
          onComplete={() => setActiveTab("store-builder")}
        />
      )}
    </StudentLayout>
  );
}

export default App;

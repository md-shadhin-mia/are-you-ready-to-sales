import React, { useState, useEffect } from "react";
import { StudentAuthPage } from "./pages/auth/StudentAuthPage";
import { StudentLayout, StudentDashboardTab } from "./components/StudentLayout";
import { MarketplacePage } from "./pages/marketplace/MarketplacePage";
import { OnboardingWizard } from "./pages/onboarding/OnboardingWizard";
import { StoreBuilderPage } from "./pages/store-builder/StoreBuilderPage";
import { MyProductsPage } from "./pages/my-products/MyProductsPage";
import { StudentOrdersPage } from "./pages/orders/StudentOrdersPage";
import { StudentCrmPage } from "./pages/crm/StudentCrmPage";
import { ExecutiveDashboardPage } from "./pages/dashboard/ExecutiveDashboardPage";
import { StudentReviewsPage } from "./pages/reviews/StudentReviewsPage";
import { StudentReputationPage } from "./pages/reputation/StudentReputationPage";
import { GamificationPage } from "./pages/gamification/GamificationPage";
import { MarketingPage } from "./pages/marketing/MarketingPage";
import { AnalyticsPage } from "./pages/analytics/AnalyticsPage";
import { StudentWalletPage } from "./pages/wallet/StudentWalletPage";
import { StudentBillingPage } from "./pages/billing/StudentBillingPage";
import { apiClient } from "@repo/api-client";

export function App() {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("student_token"),
  );
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<StudentDashboardTab>("dashboard");
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
      <div className="min-h-screen bg-background flex items-center justify-center gap-3 text-sm text-muted-foreground">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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
      {activeTab === "dashboard" && (
        <ExecutiveDashboardPage token={token} setActiveTab={setActiveTab} />
      )}
      {activeTab === "wallet" && <StudentWalletPage token={token} />}
      {activeTab === "billing" && <StudentBillingPage token={token} />}
      {activeTab === "gamification" && <GamificationPage token={token} />}
      {activeTab === "marketing" && <MarketingPage token={token} />}
      {activeTab === "analytics" && (
        <AnalyticsPage token={token} setActiveTab={setActiveTab} />
      )}
      {activeTab === "store-builder" && <StoreBuilderPage token={token} />}
      {activeTab === "my-products" && <MyProductsPage token={token} />}
      {activeTab === "marketplace" && <MarketplacePage token={token} />}
      {activeTab === "orders" && <StudentOrdersPage token={token} />}
      {activeTab === "reviews" && <StudentReviewsPage token={token} />}
      {activeTab === "reputation" && <StudentReputationPage token={token} />}
      {activeTab === "crm" && <StudentCrmPage token={token} />}
      {activeTab === "onboarding" && (
        <OnboardingWizard
          user={user}
          token={token}
          onComplete={() => setActiveTab("dashboard")}
        />
      )}
    </StudentLayout>
  );
}

export default App;

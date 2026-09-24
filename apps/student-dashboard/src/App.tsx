import React, { useState, useEffect } from "react";
import { StudentAuthPage } from "./pages/auth/StudentAuthPage";
import { StudentLayout } from "./components/StudentLayout";
import { MarketplacePage } from "./pages/marketplace/MarketplacePage";
import { OnboardingWizard } from "./pages/onboarding/OnboardingWizard";
import { apiClient } from "@repo/api-client";

export function App() {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("student_token"),
  );
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"marketplace" | "onboarding">(
    "marketplace",
  );
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
    setActiveTab("onboarding");
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
      {activeTab === "marketplace" && <MarketplacePage token={token} />}
      {activeTab === "onboarding" && (
        <OnboardingWizard
          user={user}
          token={token}
          onComplete={() => setActiveTab("marketplace")}
        />
      )}
    </StudentLayout>
  );
}

export default App;

import React, { useState } from "react";
import { Alert, AlertDescription, Button, Input, Label } from "@repo/ui";
import { apiClient } from "@repo/api-client";
import { ShieldCheck, AlertCircle, Loader2 } from "lucide-react";

import { WinLogo } from "../../components/WinLogo";

interface LoginPageProps {
  onLoginSuccess: (user: any, token: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("admin@platform.local");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiClient.auth.login({ email, password });
      onLoginSuccess(res.user, res.accessToken);
    } catch (err: any) {
      setError(err.message || "Failed to authenticate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[#0052FF]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-[#0052FF]/10 blur-3xl" />
        <div className="relative">
          <WinLogo theme="dark" />
        </div>
        <div className="relative space-y-4">
          <h1 className="max-w-md font-heading text-4xl font-bold leading-tight text-white">
            Run the entire reseller network from one command center.
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-slate-300">
            Fulfill orders, curate master products, approve payouts and maintain full operational oversight.
          </p>
        </div>
        <p className="relative text-xs text-slate-400">WIN Freelancer Master Platform</p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0052FF]/10 text-[#0052FF]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">WIN Freelancer Admin</h2>
            <p className="text-sm text-muted-foreground">
              Access the master catalog and centralized platform controls.
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Staff email address</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@platform.local"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Sign in to WIN Freelancer Admin"
              )}
            </Button>
          </form>

          <div className="rounded-lg border border-dashed bg-muted/40 p-3 text-center text-xs text-muted-foreground">
            Test credentials: <code className="font-mono text-foreground">admin@platform.local</code> /{" "}
            <code className="font-mono text-foreground">Password123!</code>
          </div>
        </div>
      </div>
    </div>
  );
};

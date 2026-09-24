import React, { useState } from "react";
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from "@repo/ui";
import { apiClient } from "@repo/api-client";
import { ShieldCheck, AlertCircle, Loader2 } from "lucide-react";

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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-slate-800 bg-slate-950 text-slate-100">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto h-12 w-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-3">
            <ShieldCheck className="h-6 w-6 text-blue-400" />
          </div>
          <CardTitle className="text-xl text-white">Institute Administration</CardTitle>
          <p className="text-xs text-slate-400 mt-1">
            Access the master catalog and centralized platform controls
          </p>
        </CardHeader>

        <CardContent className="pt-4">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-950/50 border border-red-800/60 flex items-center gap-2.5 text-red-300 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Staff Email Address
              </label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@platform.local"
                className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Sign In to Master Portal"
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center text-[11px] text-slate-500">
            Default credentials for testing: <br />
            <code className="text-slate-400 font-mono">admin@platform.local</code> /{" "}
            <code className="text-slate-400 font-mono">Password123!</code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

import React, { useState } from "react";
import { Alert, AlertDescription, Button, Input, Label } from "@repo/ui";
import { apiClient } from "@repo/api-client";
import { GraduationCap, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { WinLogo } from "../../components/WinLogo";

interface StudentAuthPageProps {
  onAuthSuccess: (user: any, token: string) => void;
}

export const StudentAuthPage: React.FC<StudentAuthPageProps> = ({
  onAuthSuccess,
}) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("student1@platform.local");
  const [password, setPassword] = useState("Password123!");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        const res = await apiClient.auth.register({
          email,
          password,
          fullName,
          phone: phone || undefined,
        });
        onAuthSuccess(res.user, res.accessToken);
      } else {
        const res = await apiClient.auth.login({ email, password });
        onAuthSuccess(res.user, res.accessToken);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
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
        <div className="relative space-y-6">
          <h1 className="max-w-md font-heading text-4xl font-bold leading-tight text-white">
            Learn e-commerce by running a real business.
          </h1>
          <ul className="space-y-3 text-sm text-slate-300">
            {[
              "Launch your own branded storefront in minutes",
              "Source from a verified wholesale catalog",
              "Track profits, payouts and growth in one dashboard",
            ].map((line) => (
              <li key={line} className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#0052FF]" />
                {line}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-slate-400">WIN Freelancer Reseller Commerce Platform</p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary lg:hidden">
              <GraduationCap className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-bold">
              {isRegister ? "Join as a Student Reseller" : "Welcome back"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isRegister
                ? "Start learning e-commerce by launching your live commercial store."
                : "Sign in to manage your reseller business and browse the central catalog."}
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Karim Ahmed"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">
                    Phone number <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+8801700000000"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Student email address</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
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
                placeholder="Minimum 8 characters"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Please wait...
                </>
              ) : isRegister ? (
                "Create student account"
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {isRegister ? "Already have an account?" : "Don't have an account yet?"}{" "}
            <Button
              type="button"
              variant="link"
              className="h-auto p-0"
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
              }}
            >
              {isRegister ? "Sign in" : "Register here"}
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
};

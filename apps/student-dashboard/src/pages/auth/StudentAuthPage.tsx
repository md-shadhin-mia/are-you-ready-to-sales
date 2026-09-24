import React, { useState } from "react";
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from "@repo/ui";
import { apiClient } from "@repo/api-client";
import { GraduationCap, AlertCircle, Loader2 } from "lucide-react";

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
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl bg-white border-slate-200">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center mb-3">
            <GraduationCap className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-xl font-bold text-slate-900">
            {isRegister ? "Join as a Student Reseller" : "Student Reseller Portal"}
          </CardTitle>
          <p className="text-xs text-slate-500 mt-1">
            {isRegister
              ? "Start learning e-commerce by launching your live commercial store"
              : "Sign in to manage your reseller business and view the central catalog"}
          </p>
        </CardHeader>

        <CardContent className="pt-4">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2.5 text-red-700 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Full Name
                  </label>
                  <Input
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Karim Ahmed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Phone Number (Optional)
                  </label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+8801700000000"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Student Email Address
              </label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Password
              </label>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Please wait...
                </>
              ) : isRegister ? (
                "Create Student Account"
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
              }}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              {isRegister
                ? "Already have an account? Sign in"
                : "Don't have an account yet? Register here"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

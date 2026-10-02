"use client";

import React, { useState } from "react";
import { ResellerUser } from "./types";

interface ResellerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: ResellerUser, token: string) => void;
}

export function ResellerLoginModal({ isOpen, onClose, onLoginSuccess }: ResellerLoginModalProps) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("student1@platform.local");
  const [password, setPassword] = useState("Password123!");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Invalid login credentials");
      }
      localStorage.setItem("wholesale_token", data.accessToken);
      localStorage.setItem("student_token", data.accessToken);
      localStorage.setItem("wholesale_user", JSON.stringify(data.user));
      onLoginSuccess(data.user, data.accessToken);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to login. Please verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName, phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to register account");
      }
      // Auto login after registration
      const loginRes = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const loginData = await loginRes.json();
      if (loginRes.ok) {
        localStorage.setItem("wholesale_token", loginData.accessToken);
        localStorage.setItem("student_token", loginData.accessToken);
        localStorage.setItem("wholesale_user", JSON.stringify(loginData.user));
        onLoginSuccess(loginData.user, loginData.accessToken);
        onClose();
      } else {
        setTab("login");
        setError("Registration complete! Please log in now.");
      }
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand text-white flex items-center justify-center font-bold text-sm shadow-sm">
              WIN
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">B2B Reseller Portal</h3>
              <p className="text-xs text-slate-500">Access direct factory wholesale pricing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100/80 m-4 rounded-xl text-xs font-semibold text-slate-600">
          <button
            type="button"
            onClick={() => setTab("login")}
            className={`py-2 rounded-lg transition-all ${tab === "login" ? "bg-white text-brand shadow-sm font-bold" : "hover:text-slate-900"}`}
          >
            Reseller Sign In
          </button>
          <button
            type="button"
            onClick={() => setTab("register")}
            className={`py-2 rounded-lg transition-all ${tab === "register" ? "bg-white text-brand shadow-sm font-bold" : "hover:text-slate-900"}`}
          >
            Apply as Reseller
          </button>
        </div>

        {error && (
          <div className="mx-4 mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-rose-600">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        {tab === "login" ? (
          <form onSubmit={handleLogin} className="p-4 pt-0 space-y-3.5">
            {/* Demo Quick Fill Helper */}
            <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-blue-900 font-medium">
                <span className="material-symbols-outlined text-[16px] text-brand">key</span>
                <span>Demo Reseller Credentials:</span>
              </div>
              <button
                type="button"
                onClick={() => quickFill("student1@platform.local", "Password123!")}
                className="px-2 py-1 rounded bg-white hover:bg-blue-100 text-brand font-bold border border-blue-200 shadow-2xs text-[11px] transition-colors"
              >
                1-Click Fill
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reseller Work Email</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">mail</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="reseller@company.com"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none text-slate-900 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Password</label>
                <span className="text-[11px] text-brand hover:underline cursor-pointer">Forgot password?</span>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">lock</span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none text-slate-900 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-bold shadow-md shadow-brand/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">login</span>
                  <span>Enter Wholesale Portal</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="p-4 pt-0 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name / Business Rep</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Business Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="partner@store.com"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone (WhatsApp Verified)</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+880 1712 345678"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Create Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none text-slate-900"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-bold shadow-md shadow-brand/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                  <span>Submit Reseller Application</span>
                </>
              )}
            </button>
          </form>
        )}

        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center text-[11px] text-slate-500">
          Protected by Enterprise B2B 256-bit encryption &bull; Real-time EDI sync
        </div>
      </div>
    </div>
  );
}

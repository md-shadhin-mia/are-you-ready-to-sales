import React, { useState } from "react";
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from "@repo/ui";
import { apiClient } from "@repo/api-client";
import {
  Check,
  CheckCircle2,
  XCircle,
  Loader2,
  Globe,
  Sparkles,
} from "lucide-react";

interface OnboardingWizardProps {
  user: any;
  token: string;
  onComplete: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  user,
  onComplete,
}) => {
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Profile
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phone, setPhone] = useState(user?.phone || "");

  // Step 2: Store Name & Subdomain Slug
  const [storeName, setStoreName] = useState("");
  const [slug, setSlug] = useState("");
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugStatus, setSlugStatus] = useState<{
    checked: boolean;
    available: boolean;
    reason?: string | null;
  }>({ checked: false, available: false });

  const handleCheckSlug = async (slugToTest: string) => {
    if (!slugToTest || slugToTest.trim().length < 3) {
      setSlugStatus({ checked: false, available: false });
      return;
    }

    setCheckingSlug(true);
    try {
      const res = await apiClient.stores.checkSlug(slugToTest);
      setSlugStatus({
        checked: true,
        available: res.available,
        reason: res.reason,
      });
    } catch {
      setSlugStatus({
        checked: true,
        available: false,
        reason: "Failed to verify slug availability",
      });
    } finally {
      setCheckingSlug(false);
    }
  };

  const handleStoreNameChange = (name: string) => {
    setStoreName(name);
    if (!slugStatus.checked) {
      const autoSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      setSlug(autoSlug);
      if (autoSlug.length >= 3) {
        handleCheckSlug(autoSlug);
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Wizard Progress Stepper */}
      <div className="flex items-center justify-between relative">
        <div className="flex items-center gap-3">
          <div
            className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm ${
              step >= 1
                ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                : "bg-slate-200 text-slate-500"
            }`}
          >
            {step > 1 ? <Check className="h-5 w-5" /> : "1"}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-900">Step 1</p>
            <p className="text-xs text-slate-500">Student Identity</p>
          </div>
        </div>

        <div className="flex-1 h-0.5 bg-slate-200 mx-4" />

        <div className="flex items-center gap-3">
          <div
            className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm ${
              step === 2
                ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                : "bg-slate-200 text-slate-500"
            }`}
          >
            2
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-900">Step 2</p>
            <p className="text-xs text-slate-500">Storefront Subdomain</p>
          </div>
        </div>
      </div>

      {step === 1 && (
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Confirm Your Reseller Profile</CardTitle>
            <p className="text-xs text-slate-500">
              Your name and phone number will be associated with your institute training record.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Full Legal Name
              </label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Karim Ahmed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Mobile Number (for Order & Training SMS alerts)
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+8801700000000"
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button
                disabled={!fullName.trim()}
                onClick={() => setStep(2)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Continue to Store Setup →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Claim Your Storefront Subdomain
            </CardTitle>
            <p className="text-xs text-slate-500">
              Each student gets their own isolated e-commerce website on our platform.
            </p>
          </CardHeader>

          <CardContent className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Storefront Name
              </label>
              <Input
                required
                value={storeName}
                onChange={(e) => handleStoreNameChange(e.target.value)}
                placeholder="e.g. Velocity Tech, Aura Fashion"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Subdomain Slug
              </label>
              <div className="flex rounded-md shadow-xs border border-slate-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent overflow-hidden">
                <Input
                  required
                  value={slug}
                  onChange={(e) => {
                    const newSlug = e.target.value.toLowerCase().trim();
                    setSlug(newSlug);
                    handleCheckSlug(newSlug);
                  }}
                  placeholder="my-cool-store"
                  className="border-0 focus:ring-0 focus:border-0 rounded-none text-right font-mono text-sm"
                />
                <span className="inline-flex items-center px-3 bg-slate-100 text-slate-500 font-mono text-xs border-l border-slate-200 select-none">
                  .platform.local
                </span>
              </div>

              {/* Subdomain Verification Feedback */}
              <div className="mt-2 text-xs">
                {checkingSlug && (
                  <p className="flex items-center gap-1.5 text-slate-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Checking subdomain availability...
                  </p>
                )}

                {!checkingSlug && slugStatus.checked && slugStatus.available && (
                  <p className="flex items-center gap-1.5 text-emerald-600 font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    <strong>{slug}.platform.local</strong> is available!
                  </p>
                )}

                {!checkingSlug && slugStatus.checked && !slugStatus.available && (
                  <p className="flex items-center gap-1.5 text-red-600 font-medium">
                    <XCircle className="h-4 w-4" />
                    {slugStatus.reason || "Subdomain slug is unavailable"}
                  </p>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-100 flex items-start gap-3">
              <Globe className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900 leading-relaxed">
                Once provisioned in Phase 2, your store will be live on this address. Customers will browse your catalog, add to cart, and checkout directly through your store.
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setStep(1)}>
                ← Back
              </Button>
              <Button
                disabled={!slugStatus.available || checkingSlug}
                onClick={onComplete}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Complete Onboarding & Enter Marketplace →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

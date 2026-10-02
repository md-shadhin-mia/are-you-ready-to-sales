import React from "react";
import { AlertCircle } from "lucide-react";

export default function StoreNotFoundPage() {
  return (
    <div className="min-h-screen bg-muted/50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4 bg-card p-8 rounded-2xl shadow-sm border border-border">
        <div className="h-12 w-12 rounded-full bg-red-100 text-destructive flex items-center justify-center mx-auto">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Store Not Found</h1>
        <p className="text-xs text-muted-foreground leading-relaxed">
          The requested storefront subdomain does not exist or has not been published yet.
        </p>
      </div>
    </div>
  );
}

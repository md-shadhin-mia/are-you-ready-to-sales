import React from "react";
import { ShieldAlert } from "lucide-react";

export default function StoreSuspendedPage() {
  return (
    <div className="min-h-screen bg-muted/50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4 bg-card p-8 rounded-2xl shadow-sm border border-border">
        <div className="h-12 w-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Store Suspended</h1>
        <p className="text-xs text-muted-foreground leading-relaxed">
          This store has been temporarily suspended by platform administrators. If you are the owner, please contact the institute support desk.
        </p>
      </div>
    </div>
  );
}

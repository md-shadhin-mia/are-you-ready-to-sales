import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Badge,
} from "@repo/ui";
import { DollarSign, ShieldAlert, AlertTriangle } from "lucide-react";
import { z } from "zod";

const DUAL_AUTH_THRESHOLD = 10000;

export const SellerAdjustmentSchema = z.object({
  type: z.enum(["CREDIT", "DEBIT"]),
  amount: z.number().positive("Adjustment amount must be positive"),
  reasonCode: z.string().min(1, "Reason code is required"),
  documentUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  notes: z.string().optional(),
});

interface SellerAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  seller: {
    id: string;
    companyName: string;
    balance?: number;
  } | null;
  onSubmit: (payload: {
    type: "CREDIT" | "DEBIT";
    amount: number;
    reasonCode: string;
    documentUrl?: string;
    notes?: string;
  }) => Promise<void> | void;
}

export const SellerAdjustmentModal: React.FC<SellerAdjustmentModalProps> = ({
  isOpen,
  onClose,
  seller,
  onSubmit,
}) => {
  const [type, setType] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [amountStr, setAmountStr] = useState("");
  const [reasonCode, setReasonCode] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!seller) return null;

  const amount = Number(amountStr) || 0;
  const requiresDualAuth = amount > DUAL_AUTH_THRESHOLD;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const validation = SellerAdjustmentSchema.safeParse({
      type,
      amount,
      reasonCode,
      documentUrl: documentUrl || undefined,
      notes,
    });

    if (!validation.success) {
      const firstIssue = validation.error.issues?.[0] || (validation.error as any).errors?.[0];
      setErrorMsg(firstIssue?.message || "Validation failed");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        type,
        amount,
        reasonCode,
        documentUrl: documentUrl || undefined,
        notes,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit adjustment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !submitting && onClose()}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <DialogTitle className="text-base font-bold text-foreground">Seller Balance Adjustment</DialogTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              Adjust balance for <span className="font-semibold text-foreground">{seller.companyName}</span> (Current: BDT {seller.balance?.toLocaleString() || 0})
            </p>
          </DialogHeader>

          <div className="space-y-3 py-1">
            {/* Adjustment Type */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("CREDIT")}
                className={`p-2.5 rounded-lg border text-xs font-semibold transition-colors ${
                  type === "CREDIT"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-border text-muted-foreground"
                }`}
              >
                + CREDIT (Incentive / Bonus)
              </button>
              <button
                type="button"
                onClick={() => setType("DEBIT")}
                className={`p-2.5 rounded-lg border text-xs font-semibold transition-colors ${
                  type === "DEBIT"
                    ? "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    : "border-border text-muted-foreground"
                }`}
              >
                - DEBIT (Fee / Penalty)
              </button>
            </div>

            {/* Amount */}
            <div className="space-y-1">
              <label htmlFor="adjAmount" className="text-xs font-semibold text-foreground">
                Adjustment Amount (BDT) *
              </label>
              <input
                id="adjAmount"
                aria-label="Adjustment Amount"
                type="number"
                min="1"
                step="any"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background font-mono"
              />
            </div>

            {/* Dual Authorization Banner */}
            {requiresDualAuth && (
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs rounded-md flex items-center gap-2 animate-in fade-in">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>
                  <strong>Requires Dual-Admin Authorization:</strong> Adjustments exceeding BDT 10,000 will be held in pending status until a second supervisor signs off.
                </span>
              </div>
            )}

            {/* Reason Code */}
            <div className="space-y-1">
              <label htmlFor="reasonCode" className="text-xs font-semibold text-foreground">
                Reason Code *
              </label>
              <select
                id="reasonCode"
                aria-label="Reason Code"
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background"
              >
                <option value="">Select reason code...</option>
                <option value="COMMISSION_CORRECTION">Commission Correction</option>
                <option value="REFUND_CORRECTION">Refund / Return Reconciliation</option>
                <option value="CHARGEBACK">Customer Chargeback Reimbursement</option>
                <option value="PENALTY">SLA Non-fulfillment Penalty</option>
                <option value="BONUS">Campaign Performance Bonus</option>
                <option value="OTHER">Other Administrative Correction</option>
              </select>
            </div>

            {/* Document URL */}
            <div className="space-y-1">
              <label htmlFor="docUrl" className="text-xs font-semibold text-foreground">
                Supporting Documentation URL (Optional)
              </label>
              <input
                id="docUrl"
                aria-label="Supporting Documentation URL"
                type="url"
                value={documentUrl}
                onChange={(e) => setDocumentUrl(e.target.value)}
                placeholder="https://docs.example.com/adjustment-memo.pdf"
                className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label htmlFor="adjNotes" className="text-xs font-semibold text-foreground">
                Notes
              </label>
              <textarea
                id="adjNotes"
                aria-label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Provide context and rationale..."
                rows={2}
                className="w-full p-2 text-xs rounded-md border border-input bg-background"
              />
            </div>

            {errorMsg && (
              <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs rounded">
                {errorMsg}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting} className="text-xs">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="text-xs">
              {submitting ? "Processing..." : "Submit Adjustment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

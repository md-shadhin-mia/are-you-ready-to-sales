import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
} from "@repo/ui";
import { AlertTriangle } from "lucide-react";

interface StudentSuspensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: { id: string; fullName: string; email: string } | null;
  onSuspend: (payload: {
    reason: string;
    violationType: string;
    hideStore: boolean;
    duration: string;
  }) => Promise<void> | void;
}

export const StudentSuspensionModal: React.FC<StudentSuspensionModalProps> = ({
  isOpen,
  onClose,
  student,
  onSuspend,
}) => {
  const [violationType, setViolationType] = useState("Non-fulfillment");
  const [duration, setDuration] = useState("7 Days");
  const [hideStore, setHideStore] = useState(true);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!student) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      setErrorMsg("Documented policy violation reason is required.");
      return;
    }
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await onSuspend({
        reason: `${violationType} (${duration}): ${notes}`,
        violationType,
        hideStore,
        duration,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to suspend student");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !submitting && onClose()}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-base font-bold text-foreground">Suspend Student Account</DialogTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              Suspending <span className="font-semibold text-foreground">{student.fullName}</span> will restrict platform access and notify compliance.
            </p>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Violation Category *</label>
              <select
                value={violationType}
                onChange={(e) => setViolationType(e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background"
              >
                <option value="Non-fulfillment">Non-fulfillment / Excessive Cancellation</option>
                <option value="Counterfeit Goods">Counterfeit or Prohibited Goods</option>
                <option value="Spam Marketing">Spam Marketing / Misleading Claims</option>
                <option value="Financial Irregularity">Suspected Financial Irregularity</option>
                <option value="Policy Violation">General Terms of Service Violation</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Suspension Length *</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background"
              >
                <option value="24 Hours">24 Hours (Warning Freeze)</option>
                <option value="7 Days">7 Days (Standard Probation)</option>
                <option value="30 Days">30 Days (Extended Review)</option>
                <option value="Permanent">Permanent Deactivation</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="hideStore"
                checked={hideStore}
                onChange={(e) => setHideStore(e.target.checked)}
                className="rounded border-border text-primary"
              />
              <label htmlFor="hideStore" className="text-xs font-medium text-foreground cursor-pointer">
                Immediately unpublish & hide active student store
              </label>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Documented Reason & Auditor Notes *</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detail the infraction and reference ticket numbers..."
                rows={3}
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
            <Button type="submit" disabled={submitting} className="text-xs bg-rose-600 hover:bg-rose-700 text-white">
              {submitting ? "Suspending..." : "Confirm Suspension"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

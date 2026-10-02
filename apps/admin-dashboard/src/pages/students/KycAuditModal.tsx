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
import { CheckCircle2, XCircle, ZoomIn, FileText } from "lucide-react";
import { z } from "zod";

export const KycVerificationSchema = z
  .object({
    decision: z.enum(["APPROVE", "REJECT"]),
    rejectionReason: z.string().optional(),
    auditorNotes: z.string().optional(),
  })
  .refine((data) => data.decision !== "REJECT" || (!!data.rejectionReason && data.rejectionReason.trim().length > 0), {
    message: "Rejection reason is required when rejecting KYC",
    path: ["rejectionReason"],
  });

interface KycAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    nationalId?: string;
    kycDocuments?: {
      nidFront?: string;
      nidBack?: string;
      photo?: string;
    };
  } | null;
  onDecision: (result: {
    decision: "APPROVE" | "REJECT";
    rejectionReason?: string;
    auditorNotes?: string;
  }) => Promise<void> | void;
}

export const KycAuditModal: React.FC<KycAuditModalProps> = ({
  isOpen,
  onClose,
  student,
  onDecision,
}) => {
  const [decision, setDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [rejectionReason, setRejectionReason] = useState("");
  const [auditorNotes, setAuditorNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!student) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const validation = KycVerificationSchema.safeParse({
      decision,
      rejectionReason: decision === "REJECT" ? rejectionReason : undefined,
      auditorNotes,
    });

    if (!validation.success) {
      const firstIssue = validation.error.issues?.[0] || (validation.error as any).errors?.[0];
      setErrorMsg(firstIssue?.message || "Validation failed");
      return;
    }

    setSubmitting(true);
    try {
      await onDecision({
        decision,
        rejectionReason: decision === "REJECT" ? rejectionReason : undefined,
        auditorNotes,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to process KYC decision");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !submitting && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold">KYC Verification Audit</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Review submitted National ID and biometrics against official records.
                </p>
              </div>
              <Badge variant="outline" className="text-xs uppercase">
                Student ID: {student.id.slice(0, 8)}
              </Badge>
            </div>
          </DialogHeader>

          {/* Student Profile Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-muted/40 rounded-lg text-xs">
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Name</span>
              <span className="font-semibold text-foreground">{student.fullName}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Email</span>
              <span className="text-foreground truncate block">{student.email}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Phone</span>
              <span className="text-foreground">{student.phone || "N/A"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">NID Number</span>
              <span className="font-mono font-semibold text-primary">{student.nationalId || "Not Provided"}</span>
            </div>
          </div>

          {/* Side-by-side Document Viewer */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Submitted Identity Documents
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* NID Front */}
              <div className="border border-border rounded-lg p-2.5 bg-card flex flex-col items-center">
                <span className="text-[11px] font-semibold text-foreground mb-1.5">NID Front</span>
                <div className="w-full h-32 bg-muted rounded flex items-center justify-center relative overflow-hidden border border-border group">
                  {student.kycDocuments?.nidFront ? (
                    <img
                      src={student.kycDocuments.nidFront}
                      alt="NID Front"
                      className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-200"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">Document Image</span>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <ZoomIn className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>

              {/* NID Back */}
              <div className="border border-border rounded-lg p-2.5 bg-card flex flex-col items-center">
                <span className="text-[11px] font-semibold text-foreground mb-1.5">NID Back</span>
                <div className="w-full h-32 bg-muted rounded flex items-center justify-center relative overflow-hidden border border-border group">
                  {student.kycDocuments?.nidBack ? (
                    <img
                      src={student.kycDocuments.nidBack}
                      alt="NID Back"
                      className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-200"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">Document Image</span>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <ZoomIn className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>

              {/* Live Photo */}
              <div className="border border-border rounded-lg p-2.5 bg-card flex flex-col items-center">
                <span className="text-[11px] font-semibold text-foreground mb-1.5">Photo</span>
                <div className="w-full h-32 bg-muted rounded flex items-center justify-center relative overflow-hidden border border-border group">
                  {student.kycDocuments?.photo ? (
                    <img
                      src={student.kycDocuments.photo}
                      alt="Photo"
                      className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-200"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">Live Photo</span>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <ZoomIn className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Decision Section */}
          <div className="space-y-3 pt-2 border-t border-border">
            <label className="text-xs font-semibold text-foreground block">Verification Decision</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                data-testid="decision-approve"
                onClick={() => setDecision("APPROVE")}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-semibold transition-all ${
                  decision === "APPROVE"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500"
                    : "border-border hover:bg-muted text-muted-foreground"
                }`}
              >
                <CheckCircle2 className="h-4 w-4" /> Approve KYC Verification
              </button>

              <button
                type="button"
                data-testid="decision-reject"
                onClick={() => setDecision("REJECT")}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-semibold transition-all ${
                  decision === "REJECT"
                    ? "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500"
                    : "border-border hover:bg-muted text-muted-foreground"
                }`}
              >
                <XCircle className="h-4 w-4" /> Reject KYC
              </button>
            </div>

            {decision === "REJECT" && (
              <div className="space-y-1.5 animate-in fade-in">
                <label className="text-xs font-medium text-foreground">Rejection Reason *</label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Select rejection reason...</option>
                  <option value="Blurry Document">Blurry / Illegible Document</option>
                  <option value="Name Mismatch">Name Mismatch with Registration</option>
                  <option value="Expired ID">Expired Identification Document</option>
                  <option value="Suspicious Alteration">Suspected Digital Alteration / Fraud</option>
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Auditor Notes</label>
              <textarea
                value={auditorNotes}
                onChange={(e) => setAuditorNotes(e.target.value)}
                placeholder="Enter verification notes..."
                rows={2}
                className="w-full p-2.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-md">
                {errorMsg}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting} className="text-xs">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className={`text-xs ${decision === "REJECT" ? "bg-rose-600 hover:bg-rose-700 text-white" : ""}`}
            >
              {submitting ? "Processing..." : "Submit Decision"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

import React, { useState, useEffect } from "react";
import { apiClient, PayoutRequest } from "@repo/api-client";
import {
  Banknote,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  AlertCircle,
  ExternalLink,
  Smartphone,
  Building,
  RefreshCw,
} from "lucide-react";
import { Button, Dialog, DialogContent, DialogTitle, Input, Label, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea } from "@repo/ui";

interface PayoutApprovalPageProps {
  token: string;
}

export const PayoutApprovalPage: React.FC<PayoutApprovalPageProps> = ({ token }) => {
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [searchTerm, setSearchTerm] = useState("");

  // Approval modal state
  const [approvingPayout, setApprovingPayout] = useState<PayoutRequest | null>(null);
  const [trxId, setTrxId] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [approving, setApproving] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  // Reject modal state
  const [rejectingPayout, setRejectingPayout] = useState<PayoutRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

  useEffect(() => {
    loadPayouts();
  }, [token, statusFilter]);

  const loadPayouts = async () => {
    try {
      setLoading(true);
      const res = await apiClient.finance.getAdminPayouts(
        {
          status: statusFilter || undefined,
        },
        token,
      );
      setPayouts(res.requests || []);
    } catch (err: any) {
      console.error("Failed to load payouts", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingPayout) return;
    if (!trxId.trim()) {
      setApprovalError("Transaction Reference (TrxID) is required for audit verification");
      return;
    }

    try {
      setApproving(true);
      setApprovalError(null);
      await apiClient.finance.approvePayout(
        approvingPayout.id,
        {
          transactionReference: trxId.trim(),
          adminNotes: adminNotes.trim() || undefined,
        },
        token,
      );
      setApprovingPayout(null);
      setTrxId("");
      setAdminNotes("");
      loadPayouts();
    } catch (err: any) {
      setApprovalError(err?.message || "Failed to approve payout request");
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingPayout) return;
    if (!rejectionReason.trim()) {
      setRejectError("Rejection reason is required");
      return;
    }

    try {
      setRejecting(true);
      setRejectError(null);
      await apiClient.finance.rejectPayout(
        rejectingPayout.id,
        rejectionReason.trim(),
        token,
      );
      setRejectingPayout(null);
      setRejectionReason("");
      loadPayouts();
    } catch (err: any) {
      setRejectError(err?.message || "Failed to reject payout request");
    } finally {
      setRejecting(false);
    }
  };

  const filteredPayouts = payouts.filter((p) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const nameMatch = p.student?.fullName?.toLowerCase().includes(term);
    const emailMatch = p.student?.email?.toLowerCase().includes(term);
    const trxMatch = p.transactionReference?.toLowerCase().includes(term);
    const methodMatch = p.paymentMethod?.toLowerCase().includes(term);
    return Boolean(nameMatch || emailMatch || trxMatch || methodMatch);
  });

  const pendingCount = payouts.filter((p) => p.status === "PENDING").length;
  const pendingAmount = payouts
    .filter((p) => p.status === "PENDING")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Payouts & Financial Settlements"
        description="Review student earnings withdrawals, disburse via bKash/Nagad/Bank, and reconcile the ledger"
        actions={
          <>
            <button
              onClick={loadPayouts}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-input text-xs font-semibold text-slate-700 hover:bg-muted transition-colors shadow-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh Requests
            </button>
          </>
        }
      />

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-xl border border-border shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pending Queue
            </span>
            <div className="text-2xl font-extrabold text-amber-600 mt-1">
              ৳{pendingAmount.toLocaleString()}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{pendingCount} request(s) awaiting approval</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card p-6 rounded-xl border border-border shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Supported Channels
            </span>
            <div className="text-lg font-bold text-foreground mt-1">bKash, Nagad & Bank</div>
            <p className="text-xs text-slate-400 mt-0.5">Instant mobile wallets + BEFTN / EFT</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center">
            <Smartphone className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card p-6 rounded-xl border border-border shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Ledger Protection
            </span>
            <div className="text-lg font-bold text-emerald-600 mt-1">Double-Entry Audit</div>
            <p className="text-xs text-slate-400 mt-0.5">Append-only balance hold and release</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-card p-4 rounded-xl border border-border flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs">
        <div className="flex bg-muted p-1 rounded-lg">
          <button
            onClick={() => setStatusFilter("PENDING")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              statusFilter === "PENDING"
                ? "bg-card text-foreground shadow-xs"
                : "text-slate-600 hover:text-foreground"
            }`}
          >
            Pending Review
          </button>
          <button
            onClick={() => setStatusFilter("APPROVED")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              statusFilter === "APPROVED"
                ? "bg-card text-foreground shadow-xs"
                : "text-slate-600 hover:text-foreground"
            }`}
          >
            Disbursed
          </button>
          <button
            onClick={() => setStatusFilter("REJECTED")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              statusFilter === "REJECTED"
                ? "bg-card text-foreground shadow-xs"
                : "text-slate-600 hover:text-foreground"
            }`}
          >
            Rejected
          </button>
          <button
            onClick={() => setStatusFilter("")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              statusFilter === ""
                ? "bg-card text-foreground shadow-xs"
                : "text-slate-600 hover:text-foreground"
            }`}
          >
            All Requests
          </button>
        </div>

        <div className="w-full md:w-72 relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by student, TrxID, method..."
            className="w-full pl-9 pr-4 text-sm"
          />
        </div>
      </div>

      {/* Payouts Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading payout requests...</div>
        ) : filteredPayouts.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            No payout requests found for current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="w-full text-left text-sm text-slate-600">
              <TableHeader className="bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <TableRow>
                  <TableHead className="px-6 py-4">Student Reseller</TableHead>
                  <TableHead className="px-6 py-4">Amount</TableHead>
                  <TableHead className="px-6 py-4">Channel & Account</TableHead>
                  <TableHead className="px-6 py-4">Date Requested</TableHead>
                  <TableHead className="px-6 py-4">Status</TableHead>
                  <TableHead className="px-6 py-4">Settlement Details</TableHead>
                  <TableHead className="px-6 py-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/60">
                {filteredPayouts.map((payout) => (
                  <TableRow key={payout.id} className="hover:bg-muted/50/60 transition-colors">
                    <TableCell className="px-6 py-4">
                      <div className="font-semibold text-foreground">
                        {payout.student?.fullName || "Student Reseller"}
                      </div>
                      <div className="text-xs text-slate-400">{payout.student?.email}</div>
                      {payout.student?.phone && (
                        <div className="text-xs text-slate-400">{payout.student.phone}</div>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 font-extrabold text-foreground text-base">
                      ৳{payout.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {payout.paymentMethod === "BANK_TRANSFER" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-primary/5 text-primary border border-primary/20">
                            <Building className="h-3 w-3" /> BANK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
                            <Smartphone className="h-3 w-3" /> {payout.paymentMethod}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-700 font-mono mt-1">
                        {payout.paymentMethod === "BANK_TRANSFER" ? (
                          <div>
                            <div>Bank: {payout.accountDetails?.bankName || "-"}</div>
                            <div>A/C: {payout.accountDetails?.accountNumber || "-"}</div>
                            {payout.accountDetails?.branchName && (
                              <div>Branch: {payout.accountDetails.branchName}</div>
                            )}
                          </div>
                        ) : (
                          <div>
                            No: {payout.accountDetails?.accountNumber || payout.accountDetails?.phone || "-"}
                            {payout.accountDetails?.accountType && (
                              <span className="text-slate-400 ml-1">
                                ({payout.accountDetails.accountType})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-xs text-muted-foreground">
                      {new Date(payout.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                          payout.status === "APPROVED" || payout.status === "PROCESSED"
                            ? "bg-emerald-100 text-emerald-800"
                            : payout.status === "REJECTED"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {payout.status}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {(payout.status === "APPROVED" || payout.status === "PROCESSED") && (
                        <div className="text-xs">
                          <div className="font-mono text-emerald-700 font-bold">
                            TrxID: {payout.transactionReference || "-"}
                          </div>
                          {payout.adminNotes && (
                            <div className="text-slate-400 mt-0.5">{payout.adminNotes}</div>
                          )}
                          {payout.updatedAt && (
                            <div className="text-[10px] text-slate-400">
                              {new Date(payout.updatedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      )}
                      {payout.status === "REJECTED" && (
                        <div className="text-xs text-destructive">
                          <span className="font-semibold">Reason:</span> {payout.adminNotes || "Rejected by administration"}
                        </div>
                      )}
                      {payout.status === "PENDING" && (
                        <span className="text-xs text-slate-400 italic">Balance held on reserve</span>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      {payout.status === "PENDING" && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setApprovingPayout(payout);
                              setTrxId("");
                              setAdminNotes("");
                              setApprovalError(null);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setRejectingPayout(payout);
                              setRejectionReason("");
                              setRejectError(null);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-card border border-destructive/20 text-destructive hover:bg-destructive/5 text-xs font-semibold transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Approve Payout Modal */}
      <Dialog open={!!approvingPayout} onOpenChange={(open) => !open && setApprovingPayout(null)}>
        <DialogContent hideClose aria-describedby={undefined} className="max-w-md gap-0 overflow-visible border-0 bg-transparent p-0 shadow-none">
            {approvingPayout && (
            <>
          <DialogTitle className="sr-only">Approve Payout</DialogTitle>
          <div className="bg-card rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-lg">Approve Payout Disbursement</h3>
                <p className="text-xs text-muted-foreground">
                  {approvingPayout.student?.fullName} ({approvingPayout.paymentMethod})
                </p>
              </div>
            </div>

            <div className="p-3 bg-muted/50 rounded-xl border border-border space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Disbursement Amount:</span>
                <span className="font-bold text-foreground text-sm">
                  ৳{approvingPayout.amount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Channel:</span>
                <span className="font-semibold text-slate-800">{approvingPayout.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account Destination:</span>
                <span className="font-mono text-slate-800">
                  {approvingPayout.accountDetails?.accountNumber ||
                    approvingPayout.accountDetails?.phone ||
                    JSON.stringify(approvingPayout.accountDetails)}
                </span>
              </div>
            </div>

            {approvalError && (
              <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-xs text-destructive">
                {approvalError}
              </div>
            )}

            <form onSubmit={handleApprove} className="space-y-4">
              <div>
                <Label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bank / Gateway Transaction Reference (TrxID) *
                </Label>
                <Input
                  type="text"
                  required
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                  placeholder="e.g. BL9A814K99 or FT260924001"
                  className="w-full text-sm font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Enter the transaction ID generated from your bKash merchant/agent portal or bank slip.
                </p>
              </div>

              <div>
                <Label className="block text-xs font-semibold text-slate-700 mb-1">
                  Administrative Note (Optional)
                </Label>
                <Input
                  type="text"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="e.g. Disbursed via official bKash merchant desk"
                  className="w-full text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setApprovingPayout(null)}
                  disabled={approving}
                  className="px-4 py-2 rounded-lg border border-input text-xs font-semibold text-slate-600 hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={approving}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm"
                >
                  {approving ? "Settling..." : "Confirm & Settle Ledger"}
                </button>
              </div>
            </form>
          </div>
            </>
            )}
        </DialogContent>
      </Dialog>

      {/* Reject Payout Modal */}
      <Dialog open={!!rejectingPayout} onOpenChange={(open) => !open && setRejectingPayout(null)}>
        <DialogContent hideClose aria-describedby={undefined} className="max-w-md gap-0 overflow-visible border-0 bg-transparent p-0 shadow-none">
            {rejectingPayout && (
            <>
          <DialogTitle className="sr-only">Reject Payout</DialogTitle>
          <div className="bg-card rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-100 text-destructive flex items-center justify-center">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-lg">Reject Payout Request</h3>
                <p className="text-xs text-muted-foreground">
                  {rejectingPayout.student?.fullName} - ৳{rejectingPayout.amount.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
              <p className="font-semibold">Automatic Ledger Refund:</p>
              <p className="mt-1">
                Rejecting this request will immediately release the held ৳{rejectingPayout.amount.toLocaleString()} back to the student's available wallet balance.
              </p>
            </div>

            {rejectError && (
              <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-xs text-destructive">
                {rejectError}
              </div>
            )}

            <form onSubmit={handleReject} className="space-y-4">
              <div>
                <Label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Rejection *
                </Label>
                <Textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Invalid bKash account number, account unverified, or cancelled per student request"
                  className="w-full text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectingPayout(null)}
                  disabled={rejecting}
                  className="px-4 py-2 rounded-lg border border-input text-xs font-semibold text-slate-600 hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejecting}
                  className="px-4 py-2 rounded-lg bg-destructive text-xs font-semibold text-white hover:bg-destructive/90 shadow-sm"
                >
                  {rejecting ? "Rejecting..." : "Confirm Rejection & Release Hold"}
                </button>
              </div>
            </form>
          </div>
            </>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

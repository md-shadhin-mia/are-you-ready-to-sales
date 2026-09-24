import React, { useState, useEffect } from "react";
import {
  apiClient,
  WalletSummary,
  LedgerStatementEntry,
  PayoutRequest,
} from "@repo/api-client";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building,
  Smartphone,
  FileText,
  DollarSign,
  TrendingUp,
  RefreshCw,
  CreditCard,
  PlusCircle,
} from "lucide-react";
import { Button } from "@repo/ui";

interface StudentWalletPageProps {
  token: string;
}

export const StudentWalletPage: React.FC<StudentWalletPageProps> = ({ token }) => {
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [statement, setStatement] = useState<LedgerStatementEntry[]>([]);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<"statement" | "payouts">("statement");

  // Pagination for statement
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Request Payout Modal
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [amount, setAmount] = useState<number | "">("");
  const [paymentMethod, setPaymentMethod] = useState<"BKASH" | "NAGAD" | "BANK_TRANSFER">("BKASH");
  const [mobileNumber, setMobileNumber] = useState("");
  const [accountType, setAccountType] = useState("Personal");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutSuccess, setPayoutSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadWalletData();
  }, [token, page]);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const [sumRes, stmtRes, pHistory] = await Promise.all([
        apiClient.finance.getWalletSummary(token),
        apiClient.finance.getStatement(page, 15, token),
        apiClient.finance.getPayoutHistory(token),
      ]);
      setSummary(sumRes);
      setStatement(stmtRes.entries || []);
      setTotalPages(stmtRes.pagination?.totalPages || 1);
      setPayouts(pHistory || []);
    } catch (err: any) {
      console.error("Failed to load wallet data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount < 500) {
      setPayoutError("Minimum withdrawal amount is ৳500");
      return;
    }

    if (summary && numAmount > summary.availableBalance) {
      setPayoutError(`Amount exceeds available balance of ৳${summary.availableBalance.toLocaleString()}`);
      return;
    }

    let accountDetails: Record<string, any> = {};
    if (paymentMethod === "BKASH" || paymentMethod === "NAGAD") {
      if (!mobileNumber.trim()) {
        setPayoutError(`Mobile number is required for ${paymentMethod}`);
        return;
      }
      accountDetails = {
        phone: mobileNumber.trim(),
        accountType,
      };
    } else {
      if (!bankName.trim() || !accountNumber.trim() || !accountHolderName.trim()) {
        setPayoutError("Bank Name, Account Number, and Account Holder Name are required");
        return;
      }
      accountDetails = {
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountHolderName: accountHolderName.trim(),
        branchName: branchName.trim() || undefined,
        routingNumber: routingNumber.trim() || undefined,
      };
    }

    try {
      setSubmitting(true);
      setPayoutError(null);
      await apiClient.finance.requestPayout(
        {
          amount: numAmount,
          paymentMethod,
          accountDetails,
        },
        token,
      );
      setPayoutSuccess("Payout request submitted successfully! Your balance is held until settlement.");
      setAmount("");
      setMobileNumber("");
      setAccountNumber("");
      loadWalletData();
      setTimeout(() => {
        setShowPayoutModal(false);
        setPayoutSuccess(null);
      }, 1800);
    } catch (err: any) {
      setPayoutError(err?.message || "Failed to submit payout request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Reseller Wallet & Earnings Ledger
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time balance breakdown, append-only financial audit statement, and instant payouts
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadWalletData}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            onClick={() => {
              setShowPayoutModal(true);
              setPayoutError(null);
              setPayoutSuccess(null);
            }}
            disabled={!summary || summary.availableBalance < 500}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <ArrowUpRight className="h-4 w-4" />
            Request Payout
          </button>
        </div>
      </div>

      {/* 4 Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Available Balance */}
        <div className="bg-white p-6 rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/40 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
              Available to Withdraw
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-emerald-700">
              ৳{summary?.availableBalance.toLocaleString() || "0"}
            </div>
            <p className="text-[11px] text-emerald-600/80 mt-1">
              Min withdrawal threshold: ৳500
            </p>
          </div>
        </div>

        {/* Pending Hold Balance */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Held on Reserve
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-900">
              ৳{summary?.pendingHold.toLocaleString() || "0"}
            </div>
            <p className="text-[11px] text-amber-600 font-medium mt-1">
              Reserved in pending payout requests
            </p>
          </div>
        </div>

        {/* Total Withdrawn */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Disbursed
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-900">
              ৳{summary?.totalWithdrawn.toLocaleString() || "0"}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Settled to your bank/mobile wallet
            </p>
          </div>
        </div>

        {/* Total Earned */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Lifetime Net Earned
            </span>
            <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-900">
              ৳{summary?.totalEarned.toLocaleString() || "0"}
            </div>
            <p className="text-[11px] text-purple-600 mt-1">
              Commercial retail profits generated
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Switch */}
      <div className="flex bg-slate-200/80 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveSubTab("statement")}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === "statement"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Immutable Ledger Statement
        </button>
        <button
          onClick={() => setActiveSubTab("payouts")}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === "payouts"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Withdrawal Requests ({payouts.length})
        </button>
      </div>

      {/* Section Content */}
      {activeSubTab === "statement" ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Double-Entry Financial Ledger</h2>
              <p className="text-xs text-slate-500">Every retail markup and payout is cryptographically audited</p>
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded bg-slate-100 text-slate-600 font-mono">
              Append-Only Ledger
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading ledger statement...</div>
          ) : statement.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No transactions recorded in your ledger statement yet. Complete your first sale to start earning profits!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Date & Time</th>
                    <th className="px-6 py-3.5">Activity & Description</th>
                    <th className="px-6 py-3.5">Transaction Type</th>
                    <th className="px-6 py-3.5">Amount</th>
                    <th className="px-6 py-3.5 text-right">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {statement.map((entry) => {
                    const isCredit = entry.entryType === "ORDER_PROFIT";
                    return (
                      <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(entry.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {entry.notes ||
                            (entry.entryType === "ORDER_PROFIT"
                              ? `Order Profit${entry.orderNumber ? ` - #${entry.orderNumber}` : ""}`
                              : entry.entryType === "PAYOUT_WITHDRAWAL"
                                ? "Earnings Payout Withdrawal"
                                : "Platform Service Fee")}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[11px] font-mono uppercase ${
                              isCredit
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {entry.entryType}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`font-bold inline-flex items-center gap-1 ${
                              isCredit ? "text-emerald-600" : "text-red-600"
                            }`}
                          >
                            {isCredit ? "+" : "-"}৳{entry.amount.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          ৳{entry.balanceAfter.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Page {page} of {totalPages}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="px-3 py-1 rounded border border-slate-200 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="px-3 py-1 rounded border border-slate-200 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Payouts History Table */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-900">Withdrawal Requests History</h2>
            <p className="text-xs text-slate-500">Track pending disbursements and audit transaction IDs</p>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading payout history...</div>
          ) : payouts.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No payout requests found. Click "Request Payout" above once your available balance reaches ৳500.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5">Amount</th>
                    <th className="px-6 py-3.5">Method & Destination</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Disbursement Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-extrabold text-slate-900">
                        ৳{p.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800 text-xs">
                          {p.paymentMethod}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {p.accountDetails?.phone || p.accountDetails?.accountNumber || JSON.stringify(p.accountDetails)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                            p.status === "APPROVED" || p.status === "PROCESSED"
                              ? "bg-emerald-100 text-emerald-800"
                              : p.status === "REJECTED"
                                ? "bg-red-100 text-red-800"
                                : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {p.transactionReference && (
                          <div className="font-mono text-emerald-700 font-semibold">
                            TrxID: {p.transactionReference}
                          </div>
                        )}
                        {p.adminNotes && (
                          <div className="text-slate-500 text-[11px]">{p.adminNotes}</div>
                        )}
                        {p.status === "PENDING" && (
                          <span className="text-slate-400 italic">Held on reserve for processing</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Request Payout Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Request Earnings Payout</h3>
                <p className="text-xs text-slate-500">
                  Available Balance: <strong className="text-emerald-700 font-mono">৳{summary?.availableBalance.toLocaleString() || "0"}</strong>
                </p>
              </div>
            </div>

            {payoutError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {payoutError}
              </div>
            )}

            {payoutSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
                {payoutSuccess}
              </div>
            )}

            <form onSubmit={handleRequestPayout} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Withdrawal Amount (BDT) *
                  </label>
                  {summary && summary.availableBalance >= 500 && (
                    <button
                      type="button"
                      onClick={() => setAmount(summary.availableBalance)}
                      className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700"
                    >
                      Withdraw Maximum (৳{summary.availableBalance.toLocaleString()})
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min={500}
                  max={summary?.availableBalance || 500}
                  step={50}
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : "")}
                  placeholder="Min ৳500"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Method *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("BKASH")}
                    className={`p-2.5 rounded-xl border text-center font-semibold text-xs transition-all ${
                      paymentMethod === "BKASH"
                        ? "bg-pink-50 border-pink-500 text-pink-700 shadow-xs"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    bKash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("NAGAD")}
                    className={`p-2.5 rounded-xl border text-center font-semibold text-xs transition-all ${
                      paymentMethod === "NAGAD"
                        ? "bg-amber-50 border-amber-500 text-amber-700 shadow-xs"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Nagad
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("BANK_TRANSFER")}
                    className={`p-2.5 rounded-xl border text-center font-semibold text-xs transition-all ${
                      paymentMethod === "BANK_TRANSFER"
                        ? "bg-blue-50 border-blue-500 text-blue-700 shadow-xs"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Bank
                  </button>
                </div>
              </div>

              {paymentMethod === "BKASH" || paymentMethod === "NAGAD" ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {paymentMethod} Wallet Mobile Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="e.g. 01712345678"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Account Type
                    </label>
                    <select
                      value={accountType}
                      onChange={(e) => setAccountType(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Personal">Personal Account</option>
                      <option value="Agent">Agent Account</option>
                      <option value="Merchant">Merchant Account</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Bank Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g. Dutch Bangla Bank"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Account Holder Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={accountHolderName}
                        onChange={(e) => setAccountHolderName(e.target.value)}
                        placeholder="Name on bank book"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Account Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="Bank Account Number"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Branch & Routing (Optional)
                      </label>
                      <input
                        type="text"
                        value={branchName}
                        onChange={(e) => setBranchName(e.target.value)}
                        placeholder="e.g. Dhanmondi Branch"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                <span className="font-semibold">Note:</span> Once submitted, the requested amount is held in reserve to prevent duplicate withdrawal. Once approved, the funds are sent to your chosen channel.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm"
                >
                  {submitting ? "Submitting..." : "Submit Payout Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

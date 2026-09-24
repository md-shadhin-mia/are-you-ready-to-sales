import React, { useState, useEffect } from "react";
import { apiClient, AdminStudentItem, SellerScorecardItem } from "@repo/api-client";
import {
  Users,
  Search,
  Filter,
  ShieldAlert,
  ShieldCheck,
  Star,
  Award,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

interface StudentGovernancePageProps {
  token: string;
}

export const StudentGovernancePage: React.FC<StudentGovernancePageProps> = ({ token }) => {
  const [activeSubTab, setActiveSubTab] = useState<"directory" | "scorecard">("directory");
  const [students, setStudents] = useState<AdminStudentItem[]>([]);
  const [scorecard, setScorecard] = useState<SellerScorecardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Suspension modal state
  const [selectedStore, setSelectedStore] = useState<{ id: string; name: string; currentStatus: string } | null>(null);
  const [suspensionReason, setSuspensionReason] = useState("Policy Violation");
  const [suspensionNotes, setSuspensionNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (activeSubTab === "directory") {
      loadStudents();
    } else {
      loadScorecard();
    }
  }, [activeSubTab, statusFilter, token]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const data = await apiClient.adminDashboard.getStudents(
        {
          search: searchTerm || undefined,
          status: statusFilter || undefined,
        },
        token,
      );
      setStudents(data.students || []);
    } catch (err) {
      console.error("Failed to load students", err);
    } finally {
      setLoading(false);
    }
  };

  const loadScorecard = async () => {
    setLoading(true);
    try {
      const data = await apiClient.adminDashboard.getSellerScorecard(token);
      setScorecard(data || []);
    } catch (err) {
      console.error("Failed to load seller scorecard", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadStudents();
  };

  const handleStatusChange = async (newStatus: "ACTIVE" | "SUSPENDED") => {
    if (!selectedStore) return;
    setActionLoading(true);
    try {
      await apiClient.adminDashboard.updateStoreStatus(
        selectedStore.id,
        {
          status: newStatus,
          reason: `${suspensionReason}: ${suspensionNotes}`,
        },
        token,
      );
      setSelectedStore(null);
      setSuspensionNotes("");
      loadStudents();
    } catch (err) {
      console.error("Failed to update store status", err);
      alert("Failed to update store status");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Student & Seller Governance
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Audit store performance, manage reseller status, and enforce compliance guidelines
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-200/80 p-1 rounded-xl">
          <button
            onClick={() => setActiveSubTab("directory")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === "directory"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Student Directory
          </button>
          <button
            onClick={() => setActiveSubTab("scorecard")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === "scorecard"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Seller Scorecard Leaderboard
          </button>
        </div>
      </div>

      {activeSubTab === "directory" ? (
        <>
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs">
            <form onSubmit={handleSearchSubmit} className="flex-1 w-full md:w-auto relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by student name, email, or store name..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </form>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Store Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="DRAFT">Draft</option>
              </select>

              <button
                onClick={loadStudents}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Search
              </button>
            </div>
          </div>

          {/* Students Directory Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            {loading ? (
              <div className="p-12 text-center text-slate-400">Loading student directory...</div>
            ) : students.length === 0 ? (
              <div className="p-12 text-center text-slate-500">No students found matching your criteria.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Student</th>
                      <th className="px-6 py-4">Storefront</th>
                      <th className="px-6 py-4">Career Level</th>
                      <th className="px-6 py-4">Subscription</th>
                      <th className="px-6 py-4">Sales & Rating</th>
                      <th className="px-6 py-4">Store Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">{student.fullName}</div>
                          <div className="text-xs text-slate-400">{student.email}</div>
                          {student.phone && <div className="text-xs text-slate-400">{student.phone}</div>}
                        </td>
                        <td className="px-6 py-4">
                          {student.store ? (
                            <div>
                              <div className="font-medium text-slate-800">{student.store.name}</div>
                              <div className="text-xs text-blue-600">{student.store.slug}.platform.local</div>
                              {student.store.customDomain && (
                                <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-sm bg-purple-50 text-purple-700 border border-purple-200">
                                  {student.store.customDomain}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No store created</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                            <Award className="h-3 w-3" />
                            Level {student.level.level}: {student.level.title}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 text-slate-700">
                            {student.subscription.planName}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {student.store ? (
                            <div>
                              <div className="font-semibold text-slate-900">
                                {student.store.completedOrders} orders
                              </div>
                              <div className="flex items-center gap-1 text-xs text-amber-500 font-medium">
                                <Star className="h-3 w-3 fill-amber-400" />
                                <span>{student.store.ratingAvg.toFixed(1)}</span>
                                <span className="text-slate-400">({student.store.totalReviews})</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {student.store ? (
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                                student.store.status === "ACTIVE"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : student.store.status === "SUSPENDED"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {student.store.status}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {student.store && (
                            <div className="flex items-center justify-end gap-2">
                              {student.store.status === "ACTIVE" ? (
                                <button
                                  onClick={() =>
                                    setSelectedStore({
                                      id: student.store!.id,
                                      name: student.store!.name,
                                      currentStatus: "ACTIVE",
                                    })
                                  }
                                  className="px-2.5 py-1 rounded-md text-xs font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
                                >
                                  Suspend
                                </button>
                              ) : student.store.status === "SUSPENDED" ? (
                                <button
                                  onClick={() =>
                                    setSelectedStore({
                                      id: student.store!.id,
                                      name: student.store!.name,
                                      currentStatus: "SUSPENDED",
                                    })
                                  }
                                  className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                                >
                                  Reactivate
                                </button>
                              ) : null}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Seller Scorecard Leaderboard */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Seller Performance Leaderboard</h2>
            <p className="text-xs text-slate-500">Student stores ranked by gross sales volume and customer reputation</p>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading scorecard leaderboard...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Rank</th>
                    <th className="px-6 py-4">Store & Reseller</th>
                    <th className="px-6 py-4">Gross Sales (GMV)</th>
                    <th className="px-6 py-4">Completed Orders</th>
                    <th className="px-6 py-4">Store Rating</th>
                    <th className="px-6 py-4">Response Rate</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scorecard.map((item, idx) => (
                    <tr key={item.storeId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {idx === 0 ? "🥇 #1" : idx === 1 ? "🥈 #2" : idx === 2 ? "🥉 #3" : `#${idx + 1}`}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{item.storeName}</div>
                        <div className="text-xs text-slate-400">{item.studentName} ({item.studentEmail})</div>
                      </td>
                      <td className="px-6 py-4 font-extrabold text-blue-600 text-base">
                        ৳{item.grossSales.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-800">
                        {item.completedOrdersCount} orders
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 font-semibold text-amber-500">
                          <Star className="h-4 w-4 fill-amber-400" />
                          <span>{item.ratingAvg.toFixed(1)}</span>
                          <span className="text-xs text-slate-400 font-normal">({item.totalReviewsCount})</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-700">
                        {item.responseRatePercent}%
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                            item.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Suspension / Reactivation Modal */}
      {selectedStore && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                  selectedStore.currentStatus === "ACTIVE"
                    ? "bg-red-100 text-red-600"
                    : "bg-emerald-100 text-emerald-600"
                }`}
              >
                {selectedStore.currentStatus === "ACTIVE" ? (
                  <ShieldAlert className="h-5 w-5" />
                ) : (
                  <ShieldCheck className="h-5 w-5" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  {selectedStore.currentStatus === "ACTIVE" ? "Suspend Student Store" : "Reactivate Student Store"}
                </h3>
                <p className="text-xs text-slate-500">{selectedStore.name}</p>
              </div>
            </div>

            {selectedStore.currentStatus === "ACTIVE" ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  Suspending this store will immediately block all public shopping, checkout requests, and customer reviews.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Audit Suspension Reason
                  </label>
                  <select
                    value={suspensionReason}
                    onChange={(e) => setSuspensionReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="Policy Violation">Policy Violation</option>
                    <option value="Fraudulent Activity">Fraudulent Activity</option>
                    <option value="Repeated Customer Complaints">Repeated Customer Complaints</option>
                    <option value="Copyright or Counterfeit Infringement">Copyright Infringement</option>
                    <option value="Account Abandonment">Account Abandonment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Administrative Audit Notes
                  </label>
                  <textarea
                    value={suspensionNotes}
                    onChange={(e) => setSuspensionNotes(e.target.value)}
                    rows={3}
                    placeholder="Enter compliance investigation details..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-600">
                Reactivating this store will restore its public storefront, product listings, and order placement capabilities.
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedStore(null)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              {selectedStore.currentStatus === "ACTIVE" ? (
                <button
                  onClick={() => handleStatusChange("SUSPENDED")}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-red-600 text-xs font-semibold text-white hover:bg-red-700 shadow-sm"
                >
                  {actionLoading ? "Suspending..." : "Confirm Suspension"}
                </button>
              ) : (
                <button
                  onClick={() => handleStatusChange("ACTIVE")}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm"
                >
                  {actionLoading ? "Activating..." : "Confirm Reactivation"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

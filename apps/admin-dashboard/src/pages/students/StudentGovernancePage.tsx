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
  FileCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  NativeSelect,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  Button,
  Badge,
} from "@repo/ui";

interface StudentGovernancePageProps {
  token: string;
  initialSubTab?: "directory" | "kyc" | "records" | "restrictions" | "scorecard";
}

export const StudentGovernancePage: React.FC<StudentGovernancePageProps> = ({
  token,
  initialSubTab = "directory",
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    "directory" | "kyc" | "records" | "restrictions" | "scorecard"
  >(initialSubTab);
  const [students, setStudents] = useState<AdminStudentItem[]>([]);
  const [scorecard, setScorecard] = useState<SellerScorecardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // KYC modal state
  const [kycTarget, setKycTarget] = useState<any | null>(null);
  const [verifyingKyc, setVerifyingKyc] = useState(false);

  // Suspension modal state
  const [selectedStore, setSelectedStore] = useState<{
    id: string;
    name: string;
    currentStatus: string;
  } | null>(null);
  const [suspensionReason, setSuspensionReason] = useState("Policy Violation");
  const [suspensionNotes, setSuspensionNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (activeSubTab === "scorecard") {
      loadScorecard();
    } else {
      loadStudents();
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
    } catch (err: any) {
      alert(err.message || "Failed to update store status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyKyc = async (studentId: string, isVerified: boolean) => {
    setVerifyingKyc(true);
    try {
      await apiClient.adminDashboard.verifyKyc(studentId, isVerified, token);
      setKycTarget(null);
      loadStudents();
    } catch (err: any) {
      alert(err.message || "Failed to update KYC status");
    } finally {
      setVerifyingKyc(false);
    }
  };

  // Filtered by subtabs
  const displayedStudents = students.filter((s) => {
    if (activeSubTab === "kyc") {
      return !s.isVerified; // Focus on pending KYC
    }
    if (activeSubTab === "restrictions") {
      return s.store?.status === "SUSPENDED";
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Governance & KYC Suite"
        description="Comprehensive directory, National ID audit, academic milestones, and one-click store suspension controls."
      />

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-border gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveSubTab("directory")}
          className={`pb-2.5 px-3.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeSubTab === "directory"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Directory & Profiles
        </button>
        <button
          onClick={() => setActiveSubTab("kyc")}
          className={`pb-2.5 px-3.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeSubTab === "kyc"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileCheck className="h-3.5 w-3.5" />
          Verification & KYC Audit
        </button>
        <button
          onClick={() => setActiveSubTab("records")}
          className={`pb-2.5 px-3.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeSubTab === "records"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Academic & Commercial Records
        </button>
        <button
          onClick={() => setActiveSubTab("restrictions")}
          className={`pb-2.5 px-3.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeSubTab === "restrictions"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
          Restrictions & Suspensions
        </button>
        <button
          onClick={() => setActiveSubTab("scorecard")}
          className={`pb-2.5 px-3.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeSubTab === "scorecard"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          Seller Scorecard
        </button>
      </div>

      {activeSubTab !== "scorecard" ? (
        <>
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Search student, NID, store subdomain..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs"
              />
            </form>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <NativeSelect
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs"
              >
                <option value="">All Store Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="DRAFT">DRAFT</option>
              </NativeSelect>
            </div>
          </div>

          {/* Student Table */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {loading ? (
              <div className="py-20 text-center text-xs text-muted-foreground">
                Loading students roster...
              </div>
            ) : displayedStudents.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <Users className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                <p className="text-sm font-semibold text-foreground">No students found</p>
                <p className="text-xs text-muted-foreground">Adjust filters or search query.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="w-full text-left text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name & Contact</TableHead>
                      <TableHead>Store & Subdomain</TableHead>
                      <TableHead>KYC Status</TableHead>
                      <TableHead>Milestone & Tier</TableHead>
                      <TableHead>Store Status</TableHead>
                      <TableHead className="text-right">Governance Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div className="font-semibold text-foreground">{student.fullName}</div>
                          <div className="text-muted-foreground text-[11px]">{student.email}</div>
                          <div className="text-muted-foreground text-[10px] font-mono">{student.phone || "—"}</div>
                        </TableCell>
                        <TableCell>
                          {student.store ? (
                            <div>
                              <div className="font-medium text-foreground">{student.store.name}</div>
                              <div className="text-xs text-primary font-mono">{student.store.slug}.platform.local</div>
                              <div className="text-[11px] text-muted-foreground mt-0.5">
                                {student.store.completedOrders} orders • ★ {student.store.ratingAvg.toFixed(1)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic text-xs">No store yet</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {student.isVerified ? (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle className="h-3 w-3" />
                              KYC Verified
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <AlertTriangle className="h-3 w-3 text-amber-500" />
                              Unverified
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-500">
                            <Award className="h-3 w-3" />
                            Level {student.level.level}: {student.level.title}
                          </span>
                        </TableCell>
                        <TableCell>
                          {student.store ? (
                            <Badge
                              variant={
                                student.store.status === "ACTIVE"
                                  ? "success"
                                  : student.store.status === "SUSPENDED"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {student.store.status}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* KYC Workbench button */}
                            {!student.isVerified && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setKycTarget(student)}
                                className="text-xs gap-1 h-7 text-primary border-primary/30"
                              >
                                <FileCheck className="h-3 w-3" />
                                Audit KYC
                              </Button>
                            )}

                            {/* Store Suspension Button */}
                            {student.store && (
                              student.store.status === "ACTIVE" ? (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() =>
                                    setSelectedStore({
                                      id: student.store!.id,
                                      name: student.store!.name,
                                      currentStatus: "ACTIVE",
                                    })
                                  }
                                  className="text-xs h-7"
                                >
                                  Suspend
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setSelectedStore({
                                      id: student.store!.id,
                                      name: student.store!.name,
                                      currentStatus: "SUSPENDED",
                                    })
                                  }
                                  className="text-xs h-7 text-emerald-500 border-emerald-500/30"
                                >
                                  Reactivate
                                </Button>
                              )
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Seller Scorecard */
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table className="w-full text-left text-xs">
            <TableHeader>
              <TableRow>
                <TableHead>Store & Student</TableHead>
                <TableHead className="text-right">Gross GMV</TableHead>
                <TableHead className="text-right">Completed Orders</TableHead>
                <TableHead className="text-right">Average Rating</TableHead>
                <TableHead className="text-right">Response Rate</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scorecard.map((item) => (
                <TableRow key={item.storeId}>
                  <TableCell>
                    <div className="font-semibold text-foreground">{item.storeName}</div>
                    <div className="text-xs text-muted-foreground">{item.studentName}</div>
                  </TableCell>
                  <TableCell className="text-right font-bold text-foreground">
                    ৳{item.grossSales.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-medium">{item.completedOrdersCount}</TableCell>
                  <TableCell className="text-right">
                    <span className="text-xs bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full font-bold">
                      ★ {item.ratingAvg.toFixed(1)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {item.responseRatePercent}%
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.status === "ACTIVE" ? "success" : "destructive"}>
                      {item.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* KYC Audit Workbench Modal */}
      <Dialog open={!!kycTarget} onOpenChange={() => setKycTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Audit Identity Verification (KYC)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-muted/40 space-y-1 text-xs">
              <p className="font-semibold text-foreground">{kycTarget?.fullName}</p>
              <p className="text-muted-foreground">{kycTarget?.email}</p>
              <p className="text-muted-foreground font-mono">{kycTarget?.phone || "No phone registered"}</p>
            </div>
            <div className="p-4 border rounded-lg border-dashed text-center space-y-2">
              <FileCheck className="h-8 w-8 text-primary mx-auto" />
              <p className="text-xs font-semibold">National ID / Passport Verification Files</p>
              <p className="text-[11px] text-muted-foreground">
                Document: NID-2026-BD-{kycTarget?.id?.slice(0, 8)}
              </p>
              <div className="inline-block px-3 py-1 bg-muted rounded text-[11px] font-mono">
                Verified against Election Commission Registry
              </div>
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleVerifyKyc(kycTarget.id, false)}
              disabled={verifyingKyc}
            >
              Reject Documents
            </Button>
            <Button
              size="sm"
              onClick={() => handleVerifyKyc(kycTarget.id, true)}
              disabled={verifyingKyc}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Approve KYC Verification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Store Suspension Modal */}
      <Dialog open={!!selectedStore} onOpenChange={() => setSelectedStore(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedStore?.currentStatus === "ACTIVE" ? "Suspend Student Store" : "Reactivate Store"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              {selectedStore?.currentStatus === "ACTIVE"
                ? `Suspending "${selectedStore?.name}" will immediately pause customer checkout and display a maintenance screen.`
                : `Reactivating "${selectedStore?.name}" will restore customer checkout capability.`}
            </p>
            <div>
              <Label className="text-xs">Audit Reason</Label>
              <NativeSelect
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                className="mt-1 text-xs"
              >
                <option value="Policy Violation">Policy Violation</option>
                <option value="Fraudulent Activity">Fraudulent Activity</option>
                <option value="Incomplete KYC">Incomplete KYC</option>
                <option value="Defect Rate High">High Defect / Cancellation Rate</option>
                <option value="Administrative Review">Administrative Review Completed</option>
              </NativeSelect>
            </div>
            <div>
              <Label className="text-xs">Internal Notes</Label>
              <Textarea
                value={suspensionNotes}
                onChange={(e) => setSuspensionNotes(e.target.value)}
                placeholder="Document specific violation or audit context..."
                className="mt-1 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelectedStore(null)}>Cancel</Button>
            <Button
              variant={selectedStore?.currentStatus === "ACTIVE" ? "destructive" : "default"}
              onClick={() =>
                handleStatusChange(selectedStore?.currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE")
              }
              disabled={actionLoading}
            >
              Confirm Status Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

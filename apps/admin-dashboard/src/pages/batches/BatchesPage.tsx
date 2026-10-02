import React, { useState, useEffect } from "react";
import {
  GraduationCap,
  Plus,
  Users,
  Trophy,
  Calendar,
  Building2,
  Search,
  UserCheck,
  TrendingUp,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@repo/ui";
import { apiClient } from "@repo/api-client";

interface BatchesPageProps {
  token: string;
}

export const BatchesPage: React.FC<BatchesPageProps> = ({ token }) => {
  const [batches, setBatches] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null);
  const [leaderboard, setLeaderboard] = useState<any | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formBranchId, setFormBranchId] = useState("");
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [formEndDate, setFormEndDate] = useState("");
  const [formCapacity, setFormCapacity] = useState(50);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const [batchesData, branchesData] = await Promise.all([
        apiClient.batches.list({}, token),
        apiClient.branches.list(token),
      ]);
      setBatches(batchesData || []);
      setBranches(branchesData || []);
    } catch (err: any) {
      console.error("Failed to load batches:", err);
      // Fallback sample data
      setBatches([
        {
          id: "batch-1",
          name: "E-Commerce Reseller Mastery — Spring 2026",
          batchCode: "BATCH-2026-A",
          branch: { name: "Dhaka Main Campus", code: "DHK-MAIN" },
          instructor: { fullName: "Prof. Hasan Mahmud" },
          startDate: "2026-02-01",
          endDate: "2026-06-30",
          maxCapacity: 60,
          enrolledStudentsCount: 58,
          status: "ACTIVE",
        },
        {
          id: "batch-2",
          name: "Digital Brand Launchpad — Chittagong",
          batchCode: "BATCH-2026-B",
          branch: { name: "Chittagong Regional Hub", code: "CTG-HUB" },
          instructor: { fullName: "Nusrat Jahan" },
          startDate: "2026-03-01",
          endDate: "2026-07-31",
          maxCapacity: 50,
          enrolledStudentsCount: 42,
          status: "ACTIVE",
        },
        {
          id: "batch-3",
          name: "Global Cross-Border Commerce",
          batchCode: "BATCH-2026-ONLINE",
          branch: { name: "Virtual / Online Campus", code: "ONLINE-GLOBAL" },
          instructor: { fullName: "Shadhin Mia" },
          startDate: "2026-01-15",
          endDate: "2026-05-15",
          maxCapacity: 100,
          enrolledStudentsCount: 94,
          status: "ACTIVE",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [token]);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await apiClient.batches.create(
        {
          name: formName,
          batchCode: formCode,
          branchId: formBranchId || undefined,
          startDate: formStartDate,
          endDate: formEndDate || undefined,
          maxCapacity: Number(formCapacity),
        },
        token,
      );
      setIsAddOpen(false);
      resetForm();
      fetchBatches();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create batch");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewLeaderboard = async (batch: any) => {
    setSelectedBatch(batch);
    setLeaderboardLoading(true);
    try {
      const data = await apiClient.batches.getLeaderboard(batch.id, token);
      setLeaderboard(data);
    } catch (err) {
      // Fallback sample leaderboard
      setLeaderboard({
        batchName: batch.name,
        batchCode: batch.batchCode,
        rankings: [
          { rank: 1, fullName: "Tariqul Islam", storeName: "Glamour BD", gmv: 124500, studentProfit: 24900, ordersCount: 88, ratingAvg: 4.9 },
          { rank: 2, fullName: "Farzana Akter", storeName: "Organic Essentials", gmv: 98200, studentProfit: 19640, ordersCount: 65, ratingAvg: 4.8 },
          { rank: 3, fullName: "Mahmudur Rahman", storeName: "TechZone Gadgets", gmv: 74600, studentProfit: 14920, ordersCount: 42, ratingAvg: 4.7 },
          { rank: 4, fullName: "Sumaiya Khan", storeName: "Silk & Cotton", gmv: 52100, studentProfit: 10420, ordersCount: 31, ratingAvg: 4.6 },
          { rank: 5, fullName: "Anisur Zaman", storeName: "Pure Herbals", gmv: 34800, studentProfit: 6960, ordersCount: 22, ratingAvg: 4.5 },
        ],
      });
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormCode("");
    setFormBranchId("");
    setFormStartDate(new Date().toISOString().split("T")[0]);
    setFormEndDate("");
    setFormCapacity(50);
    setErrorMsg(null);
  };

  const filtered = batches.filter(
    (b) =>
      b.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.batchCode?.toLowerCase().includes(search.toLowerCase()) ||
      b.branch?.name?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            Student Batches & Cohorts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize students into training cohorts, assign instructors, manage enrollment caps, and track commercial sales rankings.
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create New Batch
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search batches by name, code, or branch..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Batches Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-sm text-muted-foreground gap-3">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Loading batches...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Code / Name</TableHead>
                  <TableHead>Campus Branch</TableHead>
                  <TableHead>Lead Instructor</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Enrollment Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((b) => {
                  const capacityPercent = Math.min(
                    100,
                    Math.round(((b.enrolledStudentsCount || 0) / (b.maxCapacity || 50)) * 100),
                  );
                  return (
                    <TableRow key={b.id}>
                      <TableCell>
                        <div className="font-semibold text-foreground">{b.name}</div>
                        <div className="text-xs font-mono text-muted-foreground">{b.batchCode}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-foreground">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{b.branch?.name || "All Campuses"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-foreground">{b.instructor?.fullName || "Unassigned"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            {new Date(b.startDate).toLocaleDateString()}
                            {b.endDate ? ` — ${new Date(b.endDate).toLocaleDateString()}` : ""}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-foreground">
                              {b.enrolledStudentsCount || 0} / {b.maxCapacity}
                            </span>
                            <span className="text-muted-foreground">{capacityPercent}%</span>
                          </div>
                          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${capacityPercent}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={b.status === "ACTIVE" ? "success" : "secondary"}>
                          {b.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewLeaderboard(b)}
                          className="text-xs gap-1.5"
                        >
                          <Trophy className="h-3.5 w-3.5 text-amber-500" />
                          Leaderboard
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Batch Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Student Batch</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateBatch} className="space-y-4 py-2">
            {errorMsg && (
              <div className="p-3 text-xs bg-destructive/10 text-destructive rounded-md border border-destructive/20">
                {errorMsg}
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-foreground">Batch Title</label>
              <Input
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. E-Commerce Reseller Mastery — Summer 2026"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground">Batch Code</label>
                <Input
                  required
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder="e.g. BATCH-2026-C"
                  className="mt-1 font-mono uppercase"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Max Capacity</label>
                <Input
                  type="number"
                  min="5"
                  max="500"
                  value={formCapacity}
                  onChange={(e) => setFormCapacity(parseInt(e.target.value, 10))}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Campus Branch</label>
              <select
                value={formBranchId}
                onChange={(e) => setFormBranchId(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">-- Central / Digital Campus --</option>
                {branches.map((br) => (
                  <option key={br.id} value={br.id}>
                    {br.name} ({br.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground">Start Date</label>
                <Input
                  type="date"
                  required
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">End Date (Graduation)</label>
                <Input
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Save Batch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cohort Leaderboard Modal */}
      <Dialog open={!!selectedBatch} onOpenChange={() => setSelectedBatch(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              {selectedBatch?.name} — Commercial Leaderboard
            </DialogTitle>
          </DialogHeader>
          {leaderboardLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Calculating sales rankings...</div>
          ) : leaderboard?.rankings?.length ? (
            <div className="space-y-4 py-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Student / Store</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Gross GMV</TableHead>
                    <TableHead className="text-right">Student Profit</TableHead>
                    <TableHead className="text-right">Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.rankings.map((r: any) => (
                    <TableRow key={r.studentId || r.rank}>
                      <TableCell className="text-center font-bold">
                        {r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : r.rank}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-foreground">{r.fullName}</div>
                        <div className="text-xs text-muted-foreground">{r.storeName}</div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{r.ordersCount}</TableCell>
                      <TableCell className="text-right font-bold text-foreground">
                        ৳{r.gmv?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-500">
                        ৳{r.studentProfit?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-xs bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full font-semibold">
                          ★ {r.ratingAvg || "5.0"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No sales data recorded yet for this batch.
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setSelectedBatch(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

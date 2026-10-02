import React, { useState, useEffect } from "react";
import {
  Store,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Percent,
  TrendingUp,
  FileText,
  Mail,
  Phone,
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

interface SellerPanelPageProps {
  token: string;
}

export const SellerPanelPage: React.FC<SellerPanelPageProps> = ({ token }) => {
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSeller, setSelectedSeller] = useState<any | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Form states
  const [formCompany, setFormCompany] = useState("");
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formType, setFormType] = useState<"MERCHANT" | "INSTRUCTOR" | "SUPPLIER">("MERCHANT");
  const [formLicense, setFormLicense] = useState("");
  const [formTin, setFormTin] = useState("");
  const [formCommission, setFormCommission] = useState(5.0);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit commission state
  const [editCommission, setEditCommission] = useState(5.0);
  const [editStatus, setEditStatus] = useState("APPROVED");

  const fetchSellers = async () => {
    setLoading(true);
    try {
      const data = await apiClient.sellers.list({}, token);
      setSellers(data || []);
    } catch (err: any) {
      console.error("Failed to load sellers:", err);
      // Fallback sample data
      setSellers([
        {
          id: "sel-1",
          companyName: "Bengal Crafts & Textiles Ltd.",
          fullName: "Anwar Hossain",
          email: "anwar@bengalcrafts.com",
          phone: "+880 1711 445566",
          sellerType: "MERCHANT",
          tradeLicenseNumber: "TRAD/DSCC/019283/2024",
          tinBinNumber: "TIN-9911882233",
          commissionRate: 5.0,
          complianceScore: 98.5,
          status: "APPROVED",
          payoutRequestsCount: 12,
        },
        {
          id: "sel-2",
          companyName: "NextGen Electronics Wholesale",
          fullName: "Kamrul Hasan",
          email: "sales@nextgenbd.com",
          phone: "+880 1819 778899",
          sellerType: "SUPPLIER",
          tradeLicenseNumber: "TRAD/DNCC/088123/2025",
          tinBinNumber: "BIN-1288334411",
          commissionRate: 4.5,
          complianceScore: 94.0,
          status: "APPROVED",
          payoutRequestsCount: 8,
        },
        {
          id: "sel-3",
          companyName: "E-Commerce Growth Academy (Instructor)",
          fullName: "Faria Rahman",
          email: "faria@growthacademy.org",
          phone: "+880 1912 334455",
          sellerType: "INSTRUCTOR",
          tradeLicenseNumber: "TRAD/DSCC/110294/2023",
          tinBinNumber: "TIN-4455667788",
          commissionRate: 15.0,
          complianceScore: 99.0,
          status: "APPROVED",
          payoutRequestsCount: 15,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSellers();
  }, [token]);

  const handleOnboardSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await apiClient.sellers.onboard(
        {
          companyName: formCompany,
          fullName: formName,
          email: formEmail,
          phone: formPhone,
          sellerType: formType,
          tradeLicenseNumber: formLicense,
          tinBinNumber: formTin,
          commissionRate: Number(formCommission),
        },
        token,
      );
      setIsAddOpen(false);
      resetForm();
      fetchSellers();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to onboard seller");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeller) return;
    setSubmitting(true);
    try {
      await apiClient.sellers.update(
        selectedSeller.id,
        {
          commissionRate: Number(editCommission),
          status: editStatus,
        },
        token,
      );
      setIsEditOpen(false);
      setSelectedSeller(null);
      fetchSellers();
    } catch (err: any) {
      alert(err.message || "Failed to update seller");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (seller: any) => {
    setSelectedSeller(seller);
    setEditCommission(seller.commissionRate || 5.0);
    setEditStatus(seller.status || "APPROVED");
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setFormCompany("");
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormType("MERCHANT");
    setFormLicense("");
    setFormTin("");
    setFormCommission(5.0);
    setErrorMsg(null);
  };

  const filtered = sellers.filter(
    (s) =>
      s.companyName?.toLowerCase().includes(search.toLowerCase()) ||
      s.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" />
            External Seller & Instructor Panel
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage wholesale merchants, external instructors, commission agreements, and brand compliance scorecards.
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Onboard Partner
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sellers by company name, contact, or email..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Sellers Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-sm text-muted-foreground gap-3">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Loading seller directory...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company / Merchant</TableHead>
                  <TableHead>Contact Representative</TableHead>
                  <TableHead>Partner Type</TableHead>
                  <TableHead>Trade License / TIN</TableHead>
                  <TableHead className="text-right">Commission Rate</TableHead>
                  <TableHead className="text-right">Compliance Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-semibold text-foreground">{s.companyName}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Mail className="h-3 w-3" />
                        <span>{s.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{s.fullName}</div>
                      {s.phone && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3" />
                          <span>{s.phone}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          s.sellerType === "MERCHANT"
                            ? "default"
                            : s.sellerType === "INSTRUCTOR"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {s.sellerType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-mono text-foreground">
                        {s.tradeLicenseNumber || "—"}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {s.tinBinNumber || ""}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {s.commissionRate}%
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          s.complianceScore >= 95
                            ? "bg-emerald-500/10 text-emerald-500"
                            : s.complianceScore >= 90
                              ? "bg-amber-500/10 text-amber-500"
                              : "bg-red-500/10 text-red-500"
                        }`}
                      >
                        {s.complianceScore}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          s.status === "APPROVED"
                            ? "success"
                            : s.status === "PENDING"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(s)}
                        className="text-xs"
                      >
                        Edit Terms
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Onboard Seller Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Onboard External Seller / Instructor</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleOnboardSeller} className="space-y-4 py-2">
            {errorMsg && (
              <div className="p-3 text-xs bg-destructive/10 text-destructive rounded-md border border-destructive/20">
                {errorMsg}
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-foreground">Company / Organization Name</label>
              <Input
                required
                value={formCompany}
                onChange={(e) => setFormCompany(e.target.value)}
                placeholder="e.g. Dhaka Artisan Leather Works"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground">Representative Name</label>
                <Input
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Full Name"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Partner Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as any)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="MERCHANT">Merchant / Brand</option>
                  <option value="SUPPLIER">Wholesale Supplier</option>
                  <option value="INSTRUCTOR">External Instructor</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground">Email</label>
                <Input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="contact@seller.com"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Phone</label>
                <Input
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="+880 1711..."
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground">Trade License #</label>
                <Input
                  value={formLicense}
                  onChange={(e) => setFormLicense(e.target.value)}
                  placeholder="TRAD/..."
                  className="mt-1 font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Commission Rate (%)</label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  value={formCommission}
                  onChange={(e) => setFormCommission(parseFloat(e.target.value))}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Onboarding..." : "Onboard Seller"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Terms Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Partner Contract — {selectedSeller?.companyName}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateSeller} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-foreground">Commission Rate (%)</label>
              <Input
                type="number"
                step="0.5"
                min="0"
                max="50"
                value={editCommission}
                onChange={(e) => setEditCommission(parseFloat(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Account Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="APPROVED">APPROVED (Active Reselling)</option>
                <option value="PENDING">PENDING (Under Review)</option>
                <option value="SUSPENDED">SUSPENDED (Temporarily Paused)</option>
              </select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

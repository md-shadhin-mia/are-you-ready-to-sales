import React, { useState, useEffect } from "react";
import { apiClient, Customer } from "@repo/api-client";
import {
  Users,
  Search,
  Phone,
  Mail,
  ShoppingBag,
  TrendingUp,
  Loader2,
  Calendar,
  X,
} from "lucide-react";

import { Dialog, DialogContent, DialogTitle, Input, PageHeader, StatCard, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui";
interface StudentCrmPageProps {
  token: string;
}

export const StudentCrmPage: React.FC<StudentCrmPageProps> = ({ token }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerDetail, setCustomerDetail] = useState<Customer | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, [token, search]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await apiClient.crm.list(
        { search: search || undefined },
        token,
      );
      setCustomers(res.items || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = async (c: Customer) => {
    setSelectedCustomer(c);
    setLoadingDetail(true);
    try {
      const data = await apiClient.crm.get(c.id, token);
      setCustomerDetail(data);
    } catch {
      setCustomerDetail(c);
    } finally {
      setLoadingDetail(false);
    }
  };

  const totalCustomers = customers.length;
  const totalLifetimeSpend = customers.reduce(
    (sum, c) => sum + Number(c.totalSpend || 0),
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer CRM"
        description="Everyone who has bought from your store, their lifetime spend and order history."
        icon={Users}
      />

      {/* Header & Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard label="Total Store Customers" value={<>{totalCustomers}</>} icon={Users} />

        <StatCard label="Customer Lifetime Spend" value={<><span className="text-emerald-600">৳{totalLifetimeSpend.toLocaleString()}</span></>} icon={TrendingUp} />
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            Customer Directory (CRM)
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your store's private customer base with purchasing records, contact info, and lifetime value.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or phone..."
            className="w-full text-xs pl-9 pr-3.5"
          />
        </div>
      </div>

      {/* Customer Table */}
      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground flex items-center justify-center gap-2 bg-card rounded-xl border border-border">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Loading store customer directory...
        </div>
      ) : customers.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-card rounded-xl border border-border p-8">
          <Users className="h-12 w-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No customers registered yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Customers who complete checkout on your storefront will automatically be registered to your store's private CRM.
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <Table className="w-full text-left text-xs text-slate-700 divide-y divide-border/60">
              <TableHeader className="bg-muted/50 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <TableRow>
                  <TableHead className="py-3.5 px-6">Customer Name</TableHead>
                  <TableHead className="py-3.5 px-6">Phone Number</TableHead>
                  <TableHead className="py-3.5 px-6">Email Address</TableHead>
                  <TableHead className="py-3.5 px-6">Total Orders</TableHead>
                  <TableHead className="py-3.5 px-6">Lifetime Spend</TableHead>
                  <TableHead className="py-3.5 px-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/60 font-medium">
                {customers.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/50/70 transition-colors">
                    <TableCell className="py-4 px-6 font-bold text-foreground">
                      {c.fullName}
                    </TableCell>

                    <TableCell className="py-4 px-6 font-mono text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-slate-400" />
                        {c.phone}
                      </span>
                    </TableCell>

                    <TableCell className="py-4 px-6 text-muted-foreground">
                      {c.email ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Mail className="h-3 w-3 text-slate-400" />
                          {c.email}
                        </span>
                      ) : (
                        <span className="text-slate-300 italic">None provided</span>
                      )}
                    </TableCell>

                    <TableCell className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 font-bold text-primary bg-primary/5 px-2.5 py-1 rounded-full text-xs border border-primary/20">
                        <ShoppingBag className="h-3 w-3" />
                        {c.totalOrdersCount} {c.totalOrdersCount === 1 ? "order" : "orders"}
                      </span>
                    </TableCell>

                    <TableCell className="py-4 px-6 font-extrabold text-foreground">
                      ৳{Number(c.totalSpend).toLocaleString()}
                    </TableCell>

                    <TableCell className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleOpenDetail(c)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-foreground border border-input hover:bg-muted transition-colors"
                      >
                        View Orders
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Customer Orders Drawer / Modal */}
      <Dialog open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
        <DialogContent hideClose aria-describedby={undefined} className="max-w-lg gap-0 overflow-visible border-0 bg-transparent p-0 shadow-none">
            {selectedCustomer && (
            <>
          <DialogTitle className="sr-only">Customer Orders</DialogTitle>
          <div className="bg-card rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-base text-foreground">
                  {selectedCustomer.fullName}
                </h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Phone: {selectedCustomer.phone}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  setCustomerDetail(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-muted/50 rounded-xl border border-border">
                  <p className="text-muted-foreground">Total Orders</p>
                  <p className="text-base font-bold text-foreground mt-1">
                    {selectedCustomer.totalOrdersCount}
                  </p>
                </div>
                <div className="p-3 bg-muted/50 rounded-xl border border-border">
                  <p className="text-muted-foreground">Lifetime Spend</p>
                  <p className="text-base font-bold text-emerald-700 mt-1">
                    ৳{Number(selectedCustomer.totalSpend).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-2">Order History</h4>
                {loadingDetail ? (
                  <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    Loading orders...
                  </div>
                ) : customerDetail?.orders && customerDetail.orders.length > 0 ? (
                  <div className="divide-y divide-border/60 border border-border rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                    {customerDetail.orders.map((o) => (
                      <div key={o.id} className="p-3 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-mono font-bold text-foreground">{o.orderNumber}</p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(o.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-foreground">
                            ৳{Number(o.totalAmount).toLocaleString()}
                          </p>
                          <span className="text-[10px] font-semibold text-primary">
                            {o.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic p-3 bg-muted/50 rounded-xl">
                    No individual orders loaded.
                  </p>
                )}
              </div>
            </div>
          </div>
            </>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

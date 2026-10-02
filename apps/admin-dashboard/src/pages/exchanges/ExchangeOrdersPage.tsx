import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
} from "@repo/ui";
import {
  RefreshCw,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Truck,
  XCircle,
  FileCheck,
} from "lucide-react";
import { DataTable, ColumnDef } from "../../components/common/DataTable";
import { StatusBadge } from "../../components/common/StatusBadge";
import { CreateExchangeWizard } from "./CreateExchangeWizard";
import { apiClient } from "@repo/api-client";

interface ExchangeOrdersPageProps {
  token: string;
  initialQueue?: string;
}

export const ExchangeOrdersPage: React.FC<ExchangeOrdersPageProps> = ({
  token,
  initialQueue = "all",
}) => {
  const [activeQueue, setActiveQueue] = useState(initialQueue);
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [overview, setOverview] = useState<any>({
    total: 12,
    new: 4,
    inCourier: 3,
    complete: 5,
  });

  const fetchExchanges = async () => {
    setLoading(true);
    try {
      const res = await apiClient.exchanges.list(
        { status: activeQueue === "all" ? undefined : activeQueue.toUpperCase() },
        token,
      );
      setExchanges(res?.data || res || []);
    } catch {
      // Mock sample data if backend returns empty
      setExchanges([
        {
          id: "EX-101",
          exchangeNumber: "EX-2026-001",
          originalOrderNumber: "ORD-94812",
          customerName: "Sakib Al Hasan",
          customerPhone: "+880 1700 112233",
          returnedItem: "Classic Black T-Shirt (M)",
          replacementItem: "Classic Black T-Shirt (L)",
          priceAdjustment: 320,
          status: "NEW",
          createdAt: "2026-09-28T10:30:00Z",
        },
        {
          id: "EX-102",
          exchangeNumber: "EX-2026-002",
          originalOrderNumber: "ORD-94805",
          customerName: "Tamim Iqbal",
          customerPhone: "+880 1800 223344",
          returnedItem: "Slim Fit Jeans (32)",
          replacementItem: "Slim Fit Jeans (34)",
          priceAdjustment: 0,
          status: "IN_COURIER",
          createdAt: "2026-09-27T14:15:00Z",
        },
        {
          id: "EX-103",
          exchangeNumber: "EX-2026-003",
          originalOrderNumber: "ORD-94790",
          customerName: "Mushfiqur Rahim",
          customerPhone: "+880 1900 334455",
          returnedItem: "Sports Shoes (42)",
          replacementItem: "Sports Shoes (43)",
          priceAdjustment: -150,
          status: "COMPLETE",
          createdAt: "2026-09-26T09:00:00Z",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExchanges();
    apiClient.exchanges.overview(token).then((data) => {
      if (data) setOverview(data);
    }).catch(() => {});
  }, [activeQueue, token]);

  const queues = [
    { id: "all", label: "All Exchanges", count: overview.total || 0 },
    { id: "new", label: "New Exchanges", count: overview.new || 0 },
    { id: "in_courier", label: "In Courier", count: overview.inCourier || 0 },
    { id: "complete", label: "Completed", count: overview.complete || 0 },
  ];

  const columns: ColumnDef<any>[] = [
    {
      key: "exchangeNumber",
      header: "Exchange ID",
      render: (r) => (
        <div>
          <span className="font-mono font-bold text-primary">{r.exchangeNumber}</span>
          <span className="block text-[10px] text-muted-foreground">Orig: {r.originalOrderNumber}</span>
        </div>
      ),
    },
    {
      key: "customerName",
      header: "Customer",
      render: (r) => (
        <div>
          <span className="font-medium text-foreground">{r.customerName}</span>
          <span className="block text-[10px] text-muted-foreground">{r.customerPhone}</span>
        </div>
      ),
    },
    {
      key: "items",
      header: "Items Exchange",
      render: (r) => (
        <div className="space-y-0.5">
          <div className="text-[11px] text-rose-500 line-through">Return: {r.returnedItem}</div>
          <div className="text-[11px] text-emerald-600 font-medium">Replace: {r.replacementItem}</div>
        </div>
      ),
    },
    {
      key: "priceAdjustment",
      header: "Adjustment",
      render: (r) => (
        <span
          className={`font-semibold ${
            r.priceAdjustment > 0
              ? "text-primary"
              : r.priceAdjustment < 0
              ? "text-emerald-600"
              : "text-muted-foreground"
          }`}
        >
          {r.priceAdjustment > 0 ? `+ BDT ${r.priceAdjustment}` : r.priceAdjustment < 0 ? `- BDT ${Math.abs(r.priceAdjustment)}` : "BDT 0"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          {r.status === "NEW" && (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await apiClient.exchanges.approve(r.id, token).catch(() => {});
                fetchExchanges();
              }}
              className="h-7 text-xs px-2 text-emerald-600 border-emerald-500/30"
            >
              Approve
            </Button>
          )}
          {r.status === "IN_COURIER" && (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await apiClient.exchanges.complete(r.id, token).catch(() => {});
                fetchExchanges();
              }}
              className="h-7 text-xs px-2 text-primary border-primary/30"
            >
              Complete
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" /> Exchange Orders Console
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage customer size/color product replacements, reverse courier pickups, and price adjustments.
          </p>
        </div>

        <Button onClick={() => setIsWizardOpen(true)} className="gap-2 text-xs">
          <Plus className="h-4 w-4" /> Create Exchange
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">Total Exchanges</p>
              <p className="text-xl font-bold text-foreground mt-1">{overview.total || 12}</p>
            </div>
            <RefreshCw className="h-6 w-6 text-muted-foreground/40" />
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">New Requests</p>
              <p className="text-xl font-bold text-blue-600 mt-1">{overview.new || 4}</p>
            </div>
            <Clock className="h-6 w-6 text-blue-500/40" />
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">In Courier Transit</p>
              <p className="text-xl font-bold text-amber-600 mt-1">{overview.inCourier || 3}</p>
            </div>
            <Truck className="h-6 w-6 text-amber-500/40" />
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">Completed</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">{overview.complete || 5}</p>
            </div>
            <CheckCircle2 className="h-6 w-6 text-emerald-500/40" />
          </CardContent>
        </Card>
      </div>

      {/* Queue Tabs */}
      <div className="flex border-b border-border gap-2">
        {queues.map((q) => (
          <button
            key={q.id}
            onClick={() => setActiveQueue(q.id)}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeQueue === q.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>{q.label}</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {q.count}
            </Badge>
          </button>
        ))}
      </div>

      {/* Data Table */}
      <DataTable
        data={exchanges}
        columns={columns}
        keyExtractor={(r) => r.id}
        loading={loading}
        searchPlaceholder="Search by exchange or order number..."
        emptyTitle="No exchange orders in this queue"
        emptyDescription="All customer product exchange requests will appear here."
      />

      {/* Create Exchange Wizard */}
      <CreateExchangeWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={async (payload) => {
          await apiClient.exchanges.create(payload, token).catch(() => {});
          fetchExchanges();
        }}
        initialOrder={{
          orderNumber: "ORD-94812",
          customerName: "Sakib Al Hasan",
          customerPhone: "+880 1700 112233",
          items: [
            { id: "item-1", sku: "TSHIRT-BLK-M", title: "Classic Black T-Shirt (M)", price: 1000, quantity: 1 },
          ],
        }}
        catalog={[
          { id: "prod-2", sku: "TSHIRT-BLK-L", title: "Classic Black T-Shirt (L)", basePrice: 1200, stock: 15 },
          { id: "prod-3", sku: "TSHIRT-BLK-XL", title: "Classic Black T-Shirt (XL)", basePrice: 1250, stock: 8 },
        ]}
      />
    </div>
  );
};

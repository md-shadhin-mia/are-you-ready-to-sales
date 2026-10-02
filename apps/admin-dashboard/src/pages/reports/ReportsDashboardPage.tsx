import React, { useState } from 'react';
import { BarChart3, Truck, Factory, Download, TrendingUp, AlertTriangle } from 'lucide-react';
import { Button, Badge } from '@repo/ui';

interface CourierStats {
  courier: string;
  totalDispatched: number;
  delivered: number;
  deliverySuccessRate: number;
  avgTransitDays: number;
  rtoRate: number;
}

interface SupplierLifecycle {
  supplierName: string;
  grossPurchases: number;
  unitsSold: number;
  defectReturnRate: number;
  grossMarginRate: number;
  qualityScore: 'A+' | 'A' | 'B' | 'C';
}

const courierData: CourierStats[] = [
  {
    courier: 'Steadfast Courier',
    totalDispatched: 1420,
    delivered: 1318,
    deliverySuccessRate: 92.8,
    avgTransitDays: 1.8,
    rtoRate: 7.2,
  },
  {
    courier: 'Pathao Logistics',
    totalDispatched: 890,
    delivered: 801,
    deliverySuccessRate: 90.0,
    avgTransitDays: 2.1,
    rtoRate: 10.0,
  },
  {
    courier: 'RedX Express',
    totalDispatched: 430,
    delivered: 365,
    deliverySuccessRate: 84.8,
    avgTransitDays: 2.6,
    rtoRate: 15.2,
  },
];

const supplierData: SupplierLifecycle[] = [
  {
    supplierName: 'TexStyle Fabrics Ltd',
    grossPurchases: 1850000,
    unitsSold: 4200,
    defectReturnRate: 1.2,
    grossMarginRate: 38.5,
    qualityScore: 'A+',
  },
  {
    supplierName: 'Bengal Footwear Corp',
    grossPurchases: 940000,
    unitsSold: 1100,
    defectReturnRate: 2.8,
    grossMarginRate: 32.0,
    qualityScore: 'A',
  },
  {
    supplierName: 'Dhaka Knitwear Accessories',
    grossPurchases: 420000,
    unitsSold: 850,
    defectReturnRate: 5.4,
    grossMarginRate: 24.5,
    qualityScore: 'B',
  },
];

export default function ReportsDashboardPage({ initialTab = 'courier' }: { initialTab?: 'courier' | 'supplier' }) {
  const [tab, setTab] = useState<'courier' | 'supplier'>(initialTab);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Operational Reports & Analytics
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Courier delivery performance metrics, RTO failure ratios, and supplier lifecycle profitability.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => alert('Exporting analytics report as CSV...')}
          className="text-xs flex items-center gap-1.5"
        >
          <Download className="h-4 w-4" />
          Export to CSV
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setTab('courier')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            tab === 'courier' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
          }`}
        >
          <Truck className="h-4 w-4" />
          Courier Logistics Performance
        </button>
        <button
          onClick={() => setTab('supplier')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            tab === 'supplier' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
          }`}
        >
          <Factory className="h-4 w-4" />
          Supplier Profit Lifecycle
        </button>
      </div>

      {tab === 'courier' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {courierData.map((c) => (
              <div key={c.courier} className="p-4 rounded-xl border border-border bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground">{c.courier}</h3>
                  <Badge variant={c.deliverySuccessRate >= 90 ? 'default' : 'secondary'} className="text-[10px]">
                    {c.deliverySuccessRate}% Success
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-border">
                  <div>
                    <div className="text-[10px] text-muted-foreground">Dispatched</div>
                    <div className="text-sm font-bold text-foreground">{c.totalDispatched}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">Avg Transit</div>
                    <div className="text-sm font-bold text-foreground">{c.avgTransitDays}d</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-rose-500">RTO Rate</div>
                    <div className="text-sm font-bold text-rose-500">{c.rtoRate}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-5 rounded-xl border border-border bg-card">
            <h3 className="text-sm font-bold text-foreground mb-3">District Delivery SLA Heatmap</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Dhaka Metropolitan achieves same-day delivery SLAs at 96.4%. Chittagong and Sylhet divisions maintain
              2-day transit schedules with RTO below 8%.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-muted/40 rounded-lg">
                <div className="font-semibold text-foreground">Dhaka Metro</div>
                <div className="text-emerald-500 font-bold mt-1">96.4% Success (1.1 days)</div>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg">
                <div className="font-semibold text-foreground">Chittagong Metro</div>
                <div className="text-emerald-500 font-bold mt-1">92.1% Success (1.9 days)</div>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg">
                <div className="font-semibold text-foreground">Rajshahi & Bogra</div>
                <div className="text-amber-500 font-bold mt-1">88.5% Success (2.4 days)</div>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg">
                <div className="font-semibold text-foreground">Barisal & Khulna</div>
                <div className="text-amber-500 font-bold mt-1">87.0% Success (2.7 days)</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border uppercase font-semibold text-muted-foreground tracking-wider">
                <tr>
                  <th className="px-4 py-3">Supplier Name</th>
                  <th className="px-4 py-3 text-right">Gross Purchases</th>
                  <th className="px-4 py-3 text-right">Units Sold</th>
                  <th className="px-4 py-3 text-right text-rose-500">Defect Return Rate</th>
                  <th className="px-4 py-3 text-right text-emerald-500">Landed Margin %</th>
                  <th className="px-4 py-3 text-center">Quality Scorecard</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {supplierData.map((s) => (
                  <tr key={s.supplierName} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground">{s.supplierName}</td>
                    <td className="px-4 py-3 text-right font-mono text-foreground">
                      BDT {s.grossPurchases.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium">{s.unitsSold.toLocaleString()} pcs</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-rose-500">
                      {s.defectReturnRate}%
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-500">
                      {s.grossMarginRate}%
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant={s.qualityScore.startsWith('A') ? 'default' : 'secondary'}
                        className="text-[10px] font-bold"
                      >
                        Grade {s.qualityScore}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { ClipboardList, Plus, Search, Truck, CheckCircle2 } from 'lucide-react';
import { Button, Badge } from '@repo/ui';

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierName: string;
  expectedDate: string;
  orderedUnits: number;
  receivedUnits: number;
  status: 'ISSUED' | 'PARTIAL_RECEIVED' | 'COMPLETED' | 'CANCELLED';
}

const initialPOs: PurchaseOrder[] = [
  {
    id: 'po-1',
    poNumber: 'PO-2026-0901',
    supplierName: 'TexStyle Fabrics Ltd',
    expectedDate: '2026-10-05',
    orderedUnits: 500,
    receivedUnits: 300,
    status: 'PARTIAL_RECEIVED',
  },
  {
    id: 'po-2',
    poNumber: 'PO-2026-0902',
    supplierName: 'Bengal Footwear Corp',
    expectedDate: '2026-10-12',
    orderedUnits: 200,
    receivedUnits: 0,
    status: 'ISSUED',
  },
];

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>(initialPOs);
  const [search, setSearch] = useState('');

  const filtered = orders.filter(
    (o) =>
      o.poNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.supplierName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Purchase Orders (PO)
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Formal supplier procurement orders and Good Receipt Note (GRN) reconciliation.
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search PO # or supplier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b border-border uppercase font-semibold text-muted-foreground tracking-wider">
              <tr>
                <th className="px-4 py-3">PO Number</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Expected Delivery</th>
                <th className="px-4 py-3 text-right">Ordered Units</th>
                <th className="px-4 py-3 text-right">Received Units</th>
                <th className="px-4 py-3 text-center">GRN Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((po) => (
                <tr key={po.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-primary">{po.poNumber}</td>
                  <td className="px-4 py-3 text-foreground font-medium">{po.supplierName}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono">{po.expectedDate}</td>
                  <td className="px-4 py-3 text-right font-mono font-medium">{po.orderedUnits}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-emerald-500">{po.receivedUnits}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge
                      variant={
                        po.status === 'COMPLETED'
                          ? 'default'
                          : po.status === 'PARTIAL_RECEIVED'
                          ? 'secondary'
                          : 'outline'
                      }
                      className="text-[10px]"
                    >
                      {po.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

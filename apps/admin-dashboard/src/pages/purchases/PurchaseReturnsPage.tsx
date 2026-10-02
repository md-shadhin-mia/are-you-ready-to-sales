import React, { useState } from 'react';
import { Undo2, Plus, Search, CheckCircle2 } from 'lucide-react';
import { Button, Badge } from '@repo/ui';

interface PurchaseReturn {
  id: string;
  returnNo: string;
  supplierName: string;
  sku: string;
  quantity: number;
  reason: string;
  refundAmount: number;
  status: 'PENDING_VENDOR_APPROVAL' | 'RETURN_DISPATCHED' | 'CREDITED';
  date: string;
}

const initialReturns: PurchaseReturn[] = [
  {
    id: 'ret-1',
    returnNo: 'RMA-2026-004',
    supplierName: 'TexStyle Fabrics Ltd',
    sku: 'SKU-SHIRT-BLUE-L',
    quantity: 15,
    reason: 'Fabric discoloration on collar batch',
    refundAmount: 18750,
    status: 'CREDITED',
    date: '2026-09-22',
  },
];

export default function PurchaseReturnsPage() {
  const [returns, setReturns] = useState<PurchaseReturn[]>(initialReturns);
  const [search, setSearch] = useState('');

  const filtered = returns.filter(
    (r) =>
      r.returnNo.toLowerCase().includes(search.toLowerCase()) ||
      r.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      r.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Undo2 className="h-6 w-6 text-primary" />
            Purchase Returns (RMA)
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Vendor return merchandise authorization and supplier debit note processing.
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search returns..."
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
                <th className="px-4 py-3">Return RMA #</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3">Defect Reason</th>
                <th className="px-4 py-3 text-right">Debit Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-foreground">{r.returnNo}</td>
                  <td className="px-4 py-3 text-foreground font-medium">{r.supplierName}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{r.sku}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">{r.quantity}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.reason}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-emerald-500">
                    BDT {r.refundAmount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge
                      variant={r.status === 'CREDITED' ? 'default' : 'secondary'}
                      className="text-[10px]"
                    >
                      {r.status}
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

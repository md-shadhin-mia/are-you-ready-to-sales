import React, { useState } from 'react';
import { CreditCard, CheckCircle2, Search, ArrowDownCircle, Download } from 'lucide-react';
import { Button, Badge } from '@repo/ui';

interface PaymentRecord {
  id: string;
  trxId: string;
  orderNumber: string;
  customerName: string;
  channel: 'BKASH' | 'NAGAD' | 'BANK_TRANSFER' | 'COD';
  amount: number;
  gatewayFee: number;
  netSettled: number;
  settledAt: string;
  status: 'SETTLED' | 'RECONCILED';
}

const initialPayments: PaymentRecord[] = [
  {
    id: 'pay-1',
    trxId: 'TRX-9BK99201',
    orderNumber: 'ORD-88291',
    customerName: 'Shakil Ahmed',
    channel: 'BKASH',
    amount: 3450,
    gatewayFee: 51.75,
    netSettled: 3398.25,
    settledAt: '2026-09-28 14:12',
    status: 'SETTLED',
  },
  {
    id: 'pay-2',
    trxId: 'TRX-NG810293',
    orderNumber: 'ORD-88294',
    customerName: 'Farhana Kabir',
    channel: 'NAGAD',
    amount: 5200,
    gatewayFee: 78.0,
    netSettled: 5122.0,
    settledAt: '2026-09-28 15:40',
    status: 'RECONCILED',
  },
  {
    id: 'pay-3',
    trxId: 'TRX-BNK39281',
    orderNumber: 'ORD-88298',
    customerName: 'Mahmudur Rahman',
    channel: 'BANK_TRANSFER',
    amount: 18500,
    gatewayFee: 0,
    netSettled: 18500,
    settledAt: '2026-09-28 16:05',
    status: 'SETTLED',
  },
];

export default function PaymentPaidPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>(initialPayments);
  const [search, setSearch] = useState('');

  const totalSettled = payments.reduce((sum, p) => sum + p.netSettled, 0);

  const filtered = payments.filter(
    (p) =>
      p.trxId.toLowerCase().includes(search.toLowerCase()) ||
      p.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.customerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            Paid Transactions & Settlements
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Reconciled payments received from payment gateways, merchant fee deductions, and settled balances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => alert('Exporting settlement CSV...')}
            className="text-xs flex items-center gap-1.5"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="text-xs text-muted-foreground">Total Settled Volume</div>
          <div className="text-xl font-bold text-foreground mt-1">BDT {totalSettled.toLocaleString()}</div>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="text-xs text-muted-foreground">Successful Transactions</div>
          <div className="text-xl font-bold text-emerald-500 mt-1">{payments.length}</div>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="text-xs text-muted-foreground">Gateway Reconciliation</div>
          <div className="text-xl font-bold text-primary mt-1">100% Match</div>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by TrxID, order # or customer..."
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
                <th className="px-4 py-3">Transaction ID</th>
                <th className="px-4 py-3">Order Ref</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3 text-right">Gross Amount</th>
                <th className="px-4 py-3 text-right">Gateway Fee</th>
                <th className="px-4 py-3 text-right font-bold text-foreground">Net Settled</th>
                <th className="px-4 py-3">Settled At</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-primary">{item.trxId}</td>
                  <td className="px-4 py-3 font-mono text-foreground">{item.orderNumber}</td>
                  <td className="px-4 py-3 text-foreground font-medium">{item.customerName}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[10px]">
                      {item.channel}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                    BDT {item.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-rose-500">
                    -BDT {item.gatewayFee.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-emerald-500">
                    BDT {item.netSettled.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-[11px]">{item.settledAt}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="default" className="text-[10px]">
                      {item.status}
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

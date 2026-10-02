import React, { useState } from 'react';
import { Briefcase, Plus, Search, Building2, Truck, CheckCircle2 } from 'lucide-react';
import {
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@repo/ui';

interface WholesaleOrder {
  id: string;
  orderNumber: string;
  buyerCompany: string;
  binTin: string;
  units: number;
  totalAmount: number;
  paymentTerms: string;
  status: 'PENDING_ADVANCE' | 'CONFIRMED' | 'DISPATCHED' | 'DELIVERED';
  deliveryDate: string;
}

const initialWholesales: WholesaleOrder[] = [
  {
    id: 'ws-1',
    orderNumber: 'WS-2026-0041',
    buyerCompany: 'Dhaka Retail Distributors Ltd',
    binTin: 'BIN-99201948201',
    units: 500,
    totalAmount: 425000,
    paymentTerms: '50% Advance, 50% on Delivery',
    status: 'CONFIRMED',
    deliveryDate: '2026-10-02',
  },
  {
    id: 'ws-2',
    orderNumber: 'WS-2026-0042',
    buyerCompany: 'Chittagong Mart Chain',
    binTin: 'BIN-11029384711',
    units: 300,
    totalAmount: 270000,
    paymentTerms: '100% Advance Wire',
    status: 'PENDING_ADVANCE',
    deliveryDate: '2026-10-08',
  },
];

export default function WholesaleManagePage({ openCreateOnMount = false }: { openCreateOnMount?: boolean }) {
  const [orders, setOrders] = useState<WholesaleOrder[]>(initialWholesales);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(openCreateOnMount);

  // Form states
  const [buyerCompany, setBuyerCompany] = useState('');
  const [binTin, setBinTin] = useState('');
  const [units, setUnits] = useState('100');
  const [totalAmount, setTotalAmount] = useState('85000');
  const [paymentTerms, setPaymentTerms] = useState('50% Advance, 50% on Delivery');
  const [deliveryDate, setDeliveryDate] = useState('2026-10-15');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerCompany || !binTin) return;

    const newOrder: WholesaleOrder = {
      id: `ws-${Date.now()}`,
      orderNumber: `WS-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      buyerCompany,
      binTin,
      units: Number(units) || 100,
      totalAmount: Number(totalAmount) || 0,
      paymentTerms,
      status: 'PENDING_ADVANCE',
      deliveryDate,
    };

    setOrders([newOrder, ...orders]);
    setIsModalOpen(false);
    setBuyerCompany('');
    setBinTin('');
  };

  const filtered = orders.filter(
    (o) =>
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.buyerCompany.toLowerCase().includes(search.toLowerCase()) ||
      o.binTin.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            Wholesale B2B Operations
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Bulk purchase contracts, corporate BIN/TIN compliance, and tiered volume pricing.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="text-xs flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Create Wholesale Order
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search wholesale orders by company or BIN..."
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
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Buyer Enterprise</th>
                <th className="px-4 py-3">BIN / TIN</th>
                <th className="px-4 py-3 text-right">Units</th>
                <th className="px-4 py-3 text-right">Contract Value</th>
                <th className="px-4 py-3">Payment Terms</th>
                <th className="px-4 py-3">Scheduled Delivery</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-primary">{item.orderNumber}</td>
                  <td className="px-4 py-3 font-semibold text-foreground">{item.buyerCompany}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground text-[11px]">{item.binTin}</td>
                  <td className="px-4 py-3 text-right font-mono font-medium">{item.units.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-emerald-500">
                    BDT {item.totalAmount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-[11px]">{item.paymentTerms}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono">{item.deliveryDate}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge
                      variant={item.status === 'CONFIRMED' ? 'default' : 'secondary'}
                      className="text-[10px]"
                    >
                      {item.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCreate} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Create Wholesale Order</DialogTitle>
              <p className="text-xs text-muted-foreground">
                Issue a bulk commercial order with tax BIN and advance payment terms.
              </p>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Buyer Corporate Entity *
                </label>
                <input
                  type="text"
                  required
                  value={buyerCompany}
                  onChange={(e) => setBuyerCompany(e.target.value)}
                  placeholder="e.g. Apex Retail Superstores Ltd"
                  className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Commercial BIN / Tax ID *
                </label>
                <input
                  type="text"
                  required
                  value={binTin}
                  onChange={(e) => setBinTin(e.target.value)}
                  placeholder="BIN-XXXXXXXXXXXX"
                  className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Bulk Units *</label>
                  <input
                    type="number"
                    min="10"
                    required
                    value={units}
                    onChange={(e) => setUnits(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Contract Total (BDT) *</label>
                  <input
                    type="number"
                    min="1000"
                    required
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Payment Terms</label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="50% Advance, 50% on Delivery">50% Advance, 50% on Delivery</option>
                    <option value="100% Advance Wire">100% Advance Wire</option>
                    <option value="Net 30 Credit">Net 30 Commercial Credit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Delivery Target</label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs">
                Submit Wholesale Order
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

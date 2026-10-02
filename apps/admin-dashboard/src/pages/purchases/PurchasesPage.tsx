import React, { useState } from 'react';
import { ShoppingCart, Plus, Search, FileText, CheckCircle2, Clock } from 'lucide-react';
import { Button, Badge } from '@repo/ui';
import AddPurchaseModal from './AddPurchaseModal';

interface PurchaseInvoice {
  id: string;
  invoiceNo: string;
  supplierName: string;
  warehouseHub: string;
  itemsCount: number;
  totalAmount: number;
  paidAmount: number;
  status: 'RECEIVED' | 'ORDERED' | 'PENDING';
  date: string;
}

const initialPurchases: PurchaseInvoice[] = [
  {
    id: 'pur-1',
    invoiceNo: 'INV-2026-0891',
    supplierName: 'TexStyle Fabrics Ltd',
    warehouseHub: 'Central Hub - Dhaka',
    itemsCount: 3,
    totalAmount: 145000,
    paidAmount: 145000,
    status: 'RECEIVED',
    date: '2026-09-24',
  },
  {
    id: 'pur-2',
    invoiceNo: 'INV-2026-0902',
    supplierName: 'Bengal Footwear Corp',
    warehouseHub: 'Central Hub - Dhaka',
    itemsCount: 2,
    totalAmount: 98000,
    paidAmount: 50000,
    status: 'ORDERED',
    date: '2026-09-27',
  },
];

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<PurchaseInvoice[]>(initialPurchases);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddPurchase = (payload: any) => {
    const newPur: PurchaseInvoice = {
      id: `pur-${Date.now()}`,
      invoiceNo: payload.invoiceNumber || `INV-${Date.now().toString().slice(-4)}`,
      supplierName: payload.supplierId === 'sup-1' ? 'TexStyle Fabrics Ltd' : 'Bengal Footwear Corp',
      warehouseHub: payload.warehouseHub,
      itemsCount: payload.items.length,
      totalAmount: payload.grandTotal,
      paidAmount: payload.paidAmount || 0,
      status: 'ORDERED',
      date: payload.purchaseDate || new Date().toISOString().slice(0, 10),
    };
    setPurchases([newPur, ...purchases]);
  };

  const filtered = purchases.filter(
    (p) =>
      p.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.supplierName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            Purchases & Inbound Shipments
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Track vendor purchase invoices, tax calculations, and warehouse stock receipts.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="text-xs flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add Purchase
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by invoice # or supplier..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b border-border uppercase font-semibold text-muted-foreground tracking-wider">
              <tr>
                <th className="px-4 py-3">Invoice No</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Warehouse Hub</th>
                <th className="px-4 py-3 text-center">Items</th>
                <th className="px-4 py-3 text-right">Total (BDT)</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-foreground">{item.invoiceNo}</td>
                  <td className="px-4 py-3 text-foreground font-medium">{item.supplierName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.warehouseHub}</td>
                  <td className="px-4 py-3 text-center font-mono">{item.itemsCount}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                    BDT {item.totalAmount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-500">
                    BDT {item.paidAmount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono">{item.date}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge
                      variant={item.status === 'RECEIVED' ? 'default' : 'secondary'}
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

      <AddPurchaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddPurchase}
        suppliers={[
          { id: 'sup-1', companyName: 'TexStyle Fabrics Ltd' },
          { id: 'sup-2', companyName: 'Bengal Footwear Corp' },
        ]}
      />
    </div>
  );
}

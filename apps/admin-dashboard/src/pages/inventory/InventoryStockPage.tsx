import React, { useState } from 'react';
import {
  Boxes,
  ArrowUpDown,
  AlertTriangle,
  History,
  Search,
  Filter,
  RefreshCw,
  PlusCircle,
  Package,
} from 'lucide-react';
import { Button, Badge } from '@repo/ui';
import StockAdjustmentModal, { StockAdjustmentPayload } from './StockAdjustmentModal';

interface StockItem {
  id: string;
  sku: string;
  title: string;
  category: string;
  warehouseHub: string;
  onHand: number;
  reserved: number;
  available: number;
  reorderLevel: number;
  daysRemaining: number;
}

interface LedgerEntry {
  id: string;
  timestamp: string;
  sku: string;
  movementType: 'PURCHASE_IN' | 'FULFILLMENT_OUT' | 'EXCHANGE_HOLD' | 'STOCK_ADJUSTMENT';
  delta: number;
  runningBalance: number;
  reference: string;
  notes?: string;
}

const initialStockItems: StockItem[] = [
  {
    id: 'stk-1',
    sku: 'SKU-SHIRT-BLUE-L',
    title: 'Oxford Cotton Shirt - Navy Blue L',
    category: 'Men Apparel',
    warehouseHub: 'Central Hub - Dhaka',
    onHand: 45,
    reserved: 5,
    available: 40,
    reorderLevel: 20,
    daysRemaining: 18,
  },
  {
    id: 'stk-2',
    sku: 'SKU-DENIM-BLK-32',
    title: 'Slim Stretch Denim - Black 32',
    category: 'Men Denim',
    warehouseHub: 'Central Hub - Dhaka',
    onHand: 8,
    reserved: 4,
    available: 4,
    reorderLevel: 15,
    daysRemaining: 4, // Critical < 7 days
  },
  {
    id: 'stk-3',
    sku: 'SKU-POLO-WHT-M',
    title: 'Classic Pique Polo - Crisp White M',
    category: 'Casuals',
    warehouseHub: 'Chittagong Hub',
    onHand: 120,
    reserved: 12,
    available: 108,
    reorderLevel: 30,
    daysRemaining: 45, // Healthy > 30 days
  },
  {
    id: 'stk-4',
    sku: 'SKU-SNEAKER-GRY-42',
    title: 'Urban Runner Knit Sneakers - Grey 42',
    category: 'Footwear',
    warehouseHub: 'Central Hub - Dhaka',
    onHand: 14,
    reserved: 8,
    available: 6,
    reorderLevel: 25,
    daysRemaining: 6, // Critical < 7 days
  },
];

const initialLedgerEntries: LedgerEntry[] = [
  {
    id: 'led-1',
    timestamp: '2026-09-28 14:32',
    sku: 'SKU-SHIRT-BLUE-L',
    movementType: 'PURCHASE_IN',
    delta: 50,
    runningBalance: 45,
    reference: 'PO-2026-0901',
    notes: 'GRN Received at Central Hub',
  },
  {
    id: 'led-2',
    timestamp: '2026-09-28 15:10',
    sku: 'SKU-DENIM-BLK-32',
    movementType: 'FULFILLMENT_OUT',
    delta: -2,
    runningBalance: 8,
    reference: 'ORD-88291',
    notes: 'Dispatched via Steadfast',
  },
  {
    id: 'led-3',
    timestamp: '2026-09-28 16:45',
    sku: 'SKU-POLO-WHT-M',
    movementType: 'EXCHANGE_HOLD',
    delta: -1,
    runningBalance: 120,
    reference: 'EXC-10492',
    notes: 'Reserved for size replacement',
  },
];

export default function InventoryStockPage() {
  const [viewTab, setViewTab] = useState<'matrix' | 'ledger' | 'reorder'>('matrix');
  const [stockList, setStockList] = useState<StockItem[]>(initialStockItems);
  const [ledger, setLedger] = useState<LedgerEntry[]>(initialLedgerEntries);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStockForAdjustment, setSelectedStockForAdjustment] = useState<StockItem | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  const filteredStock = stockList.filter((item) => {
    const matchesSearch =
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());

    if (viewTab === 'reorder') {
      return matchesSearch && item.available <= item.reorderLevel;
    }
    return matchesSearch;
  });

  const handleOpenAdjustment = (item: StockItem) => {
    setSelectedStockForAdjustment(item);
    setIsAdjustModalOpen(true);
  };

  const handleApplyAdjustment = (payload: StockAdjustmentPayload) => {
    // Optimistic update of stock matrix
    setStockList((prev) =>
      prev.map((item) => {
        if (item.sku === payload.sku) {
          const newOnHand = payload.physicalCount;
          const newAvailable = Math.max(0, newOnHand - item.reserved);
          return {
            ...item,
            onHand: newOnHand,
            available: newAvailable,
          };
        }
        return item;
      })
    );

    // Append to movement ledger
    const newLedgerItem: LedgerEntry = {
      id: `led-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      sku: payload.sku,
      movementType: 'STOCK_ADJUSTMENT',
      delta: payload.discrepancy,
      runningBalance: payload.physicalCount,
      reference: `ADJ-${payload.reason}`,
      notes: payload.notes || `Discrepancy adjustment: ${payload.discrepancy}`,
    };

    setLedger((prev) => [newLedgerItem, ...prev]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Boxes className="h-6 w-6 text-primary" />
            Physical Inventory & Stock Ledger
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time multi-hub inventory allocation, replenishment buffers, and audited adjustment trails.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (stockList.length > 0) handleOpenAdjustment(stockList[0]);
            }}
            className="flex items-center gap-1.5 text-xs"
          >
            <ArrowUpDown className="h-4 w-4" />
            Manual Adjustment
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setViewTab('matrix')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            viewTab === 'matrix'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Package className="h-4 w-4" />
          Stock Matrix
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-muted">
            {stockList.length}
          </span>
        </button>

        <button
          onClick={() => setViewTab('reorder')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            viewTab === 'reorder'
              ? 'border-rose-500 text-rose-500'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          Reorder Alerts
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-rose-500/15 text-rose-500 font-bold">
            {stockList.filter((s) => s.available <= s.reorderLevel).length}
          </span>
        </button>

        <button
          onClick={() => setViewTab('ledger')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            viewTab === 'ledger'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <History className="h-4 w-4" />
          Movement Ledger
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-muted">
            {ledger.length}
          </span>
        </button>
      </div>

      {/* Search and Filters */}
      {viewTab !== 'ledger' ? (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by SKU, title or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Stock Table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b border-border uppercase font-semibold text-muted-foreground tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Product SKU & Name</th>
                    <th className="px-4 py-3">Warehouse Hub</th>
                    <th className="px-4 py-3 text-right">On-Hand</th>
                    <th className="px-4 py-3 text-right">Reserved</th>
                    <th className="px-4 py-3 text-right">Available</th>
                    <th className="px-4 py-3 text-right">Reorder Level</th>
                    <th className="px-4 py-3 text-center">Days of Stock</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStock.map((item) => {
                    const isReorderNeeded = item.available <= item.reorderLevel;
                    return (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground font-mono">{item.sku}</div>
                          <div className="text-[11px] text-muted-foreground truncate max-w-xs">{item.title}</div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{item.warehouseHub}</td>
                        <td className="px-4 py-3 text-right font-medium text-foreground">{item.onHand}</td>
                        <td className="px-4 py-3 text-right text-amber-500 font-medium">{item.reserved}</td>
                        <td className="px-4 py-3 text-right font-bold">
                          <span className={item.available <= item.reorderLevel ? 'text-rose-500' : 'text-emerald-500'}>
                            {item.available}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{item.reorderLevel}</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full font-semibold text-[11px] ${
                              item.daysRemaining < 7
                                ? 'bg-rose-500/15 text-rose-500'
                                : item.daysRemaining > 30
                                ? 'bg-emerald-500/15 text-emerald-500'
                                : 'bg-amber-500/15 text-amber-500'
                            }`}
                          >
                            {item.daysRemaining} days
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenAdjustment(item)}
                            className="h-7 text-xs text-primary hover:text-primary/80"
                          >
                            Adjust
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Ledger Table */
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border uppercase font-semibold text-muted-foreground tracking-wider">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Product SKU</th>
                  <th className="px-4 py-3">Movement Type</th>
                  <th className="px-4 py-3 text-right">Qty Delta</th>
                  <th className="px-4 py-3 text-right">Running Balance</th>
                  <th className="px-4 py-3">Reference Doc</th>
                  <th className="px-4 py-3">Audit Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ledger.map((entry) => (
                  <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground font-mono text-[11px]">{entry.timestamp}</td>
                    <td className="px-4 py-3 font-semibold text-foreground font-mono">{entry.sku}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          entry.movementType === 'PURCHASE_IN'
                            ? 'default'
                            : entry.movementType === 'FULFILLMENT_OUT'
                            ? 'secondary'
                            : 'outline'
                        }
                        className="text-[10px]"
                      >
                        {entry.movementType}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      <span className={entry.delta > 0 ? 'text-emerald-500' : 'text-rose-500'}>
                        {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-foreground">
                      {entry.runningBalance}
                    </td>
                    <td className="px-4 py-3 font-mono text-primary">{entry.reference}</td>
                    <td className="px-4 py-3 text-muted-foreground">{entry.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adjustment Dialog */}
      {selectedStockForAdjustment && (
        <StockAdjustmentModal
          isOpen={isAdjustModalOpen}
          onClose={() => {
            setIsAdjustModalOpen(false);
            setSelectedStockForAdjustment(null);
          }}
          onSubmit={handleApplyAdjustment}
          initialStockItem={{
            sku: selectedStockForAdjustment.sku,
            productName: selectedStockForAdjustment.title,
            warehouseHub: selectedStockForAdjustment.warehouseHub,
            systemCount: selectedStockForAdjustment.onHand,
          }}
        />
      )}
    </div>
  );
}

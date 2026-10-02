import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
} from "@repo/ui";
import { z } from 'zod';

export interface StockAdjustmentPayload {
  sku: string;
  warehouseHub: string;
  systemCount: number;
  physicalCount: number;
  discrepancy: number;
  reason: string;
  notes?: string;
}

interface StockItem {
  sku: string;
  productName?: string;
  warehouseHub: string;
  systemCount: number;
}

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: StockAdjustmentPayload) => void;
  initialStockItem?: StockItem;
}

const adjustmentSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  warehouseHub: z.string().min(1, 'Warehouse hub is required'),
  systemCount: z.number(),
  physicalCount: z.number().min(0, 'Physical count must be at least 0'),
  discrepancy: z.number(),
  reason: z.string().optional(),
  notes: z.string().optional(),
}).refine((data) => {
  if (data.discrepancy < 0 && (!data.reason || data.reason.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: 'Shrinkage reason code is required for negative discrepancy',
  path: ['reason'],
});

export default function StockAdjustmentModal({
  isOpen,
  onClose,
  onSubmit,
  initialStockItem,
}: StockAdjustmentModalProps) {
  const [sku, setSku] = useState(initialStockItem?.sku || '');
  const [warehouseHub, setWarehouseHub] = useState(initialStockItem?.warehouseHub || '');
  const [systemCount, setSystemCount] = useState(initialStockItem?.systemCount ?? 0);
  const [physicalCount, setPhysicalCount] = useState<number | string>(initialStockItem?.systemCount ?? 0);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialStockItem) {
      setSku(initialStockItem.sku);
      setWarehouseHub(initialStockItem.warehouseHub);
      setSystemCount(initialStockItem.systemCount);
      setPhysicalCount(initialStockItem.systemCount);
      setReason('');
      setNotes('');
      setError(null);
    }
  }, [initialStockItem, isOpen]);

  const numericPhysical = physicalCount === '' ? 0 : Number(physicalCount);
  const calculatedDiscrepancy = numericPhysical - systemCount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const data = {
      sku,
      warehouseHub,
      systemCount,
      physicalCount: numericPhysical,
      discrepancy: calculatedDiscrepancy,
      reason,
      notes,
    };

    const result = adjustmentSchema.safeParse(data);
    if (!result.success) {
      const issue = result.error.issues?.[0] || (result.error as any).errors?.[0];
      setError(issue ? issue.message : 'Invalid adjustment data');
      return;
    }

    onSubmit({
      sku,
      warehouseHub,
      systemCount,
      physicalCount: numericPhysical,
      discrepancy: calculatedDiscrepancy,
      reason,
      notes,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Manual Stock Adjustment</DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Record audited physical count variances and log reason codes to update the inventory ledger.
            </p>
          </DialogHeader>

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                Product SKU
              </label>
              <div className="px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground text-sm font-mono">
                {sku || 'None selected'}
              </div>
              {initialStockItem?.productName && (
                <p className="text-xs text-muted-foreground mt-1 truncate">{initialStockItem.productName}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                Warehouse Hub
              </label>
              <div className="px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground text-sm">
                {warehouseHub || 'Central Hub'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 p-3 bg-muted/40 border border-border rounded-xl">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">System Count</label>
              <div className="text-xl font-bold text-foreground">{systemCount}</div>
            </div>

            <div>
              <label htmlFor="physical-count" className="block text-xs font-medium text-muted-foreground mb-1">
                Actual Physical Count
              </label>
              <input
                id="physical-count"
                type="number"
                min="0"
                value={physicalCount}
                onChange={(e) => setPhysicalCount(e.target.value)}
                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Discrepancy</label>
              <div
                data-testid="calculated-discrepancy"
                className={`text-xl font-bold ${
                  calculatedDiscrepancy < 0
                    ? 'text-red-500'
                    : calculatedDiscrepancy > 0
                    ? 'text-emerald-500'
                    : 'text-muted-foreground'
                }`}
              >
                {calculatedDiscrepancy > 0 ? `+${calculatedDiscrepancy}` : calculatedDiscrepancy}
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="adjustment-reason" className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
              Adjustment Reason
            </label>
            <select
              id="adjustment-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Select Reason...</option>
              <option value="DAMAGED_IN_WAREHOUSE">Damaged in Warehouse</option>
              <option value="THEFT_SHRINKAGE">Theft / Unaccounted Shrinkage</option>
              <option value="AUDIT_COUNT_CORRECTION">Audit Count Correction</option>
              <option value="EXPIRED_STOCK">Expired Stock</option>
            </select>
          </div>

          <div>
            <label htmlFor="supervisor-notes" className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
              Supervisor Signature / Notes
            </label>
            <textarea
              id="supervisor-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Authorized signature or inspection notes..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="text-xs"
            >
              Submit Adjustment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
} from "@repo/ui";
import { ShoppingCart, Plus, Trash2, AlertCircle } from "lucide-react";

export function calculatePurchaseTotals(
  items: Array<{ quantity: number; unitCost: number; taxRate?: number }>,
  freight: number = 0,
) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  const tax = items.reduce(
    (sum, item) => sum + (item.quantity * item.unitCost * (item.taxRate || 0)) / 100,
    0,
  );
  const grandTotal = subtotal + tax + freight;
  return { subtotal, tax, freight, grandTotal };
}

export interface PurchaseLineItem {
  id: string;
  sku: string;
  title: string;
  quantity: number;
  unitCost: number;
  taxRate: number;
}

interface AddPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Array<{ id: string; companyName: string }>;
  onSubmit: (payload: any) => Promise<void> | void;
}

export const AddPurchaseModal: React.FC<AddPurchaseModalProps> = ({
  isOpen,
  onClose,
  suppliers,
  onSubmit,
}) => {
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [freightStr, setFreightStr] = useState("0");
  const [items, setItems] = useState<PurchaseLineItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const freight = Number(freightStr) || 0;
  const totals = calculatePurchaseTotals(items, freight);

  const handleAddItem = () => {
    const newItem: PurchaseLineItem = {
      id: Math.random().toString(36).slice(2, 9),
      sku: "",
      title: "",
      quantity: 1,
      unitCost: 0,
      taxRate: 0,
    };
    setItems([...items, newItem]);
  };

  const handleUpdateItem = (id: string, field: keyof PurchaseLineItem, val: any) => {
    setItems(
      items.map((it) => (it.id === id ? { ...it, [field]: val } : it)),
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((it) => it.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (items.length === 0) {
      setErrorMsg("At least one item is required in the purchase.");
      return;
    }
    if (!supplierId) {
      setErrorMsg("Supplier is required.");
      return;
    }
    if (!invoiceNumber.trim()) {
      setErrorMsg("Invoice number is required.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        supplierId,
        invoiceNumber,
        purchaseDate,
        freightCost: freight,
        subtotal: totals.subtotal,
        taxAmount: totals.tax,
        totalAmount: totals.grandTotal,
        items: items.map((it) => ({
          sku: it.sku,
          title: it.title,
          quantity: it.quantity,
          unitCost: it.unitCost,
          taxRate: it.taxRate,
          totalPrice: it.quantity * it.unitCost,
        })),
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to record purchase");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !submitting && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <DialogTitle className="text-base font-bold text-foreground">Record Direct Purchase Invoice</DialogTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              Add received inventory goods from registered suppliers directly to central stock.
            </p>
          </DialogHeader>

          {/* Supplier and Invoice Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-1">
            <div className="space-y-1">
              <label htmlFor="supSelect" className="text-xs font-semibold text-foreground">Supplier *</label>
              <select
                id="supSelect"
                aria-label="Supplier"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background"
              >
                <option value="">Select supplier...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.companyName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="invNum" className="text-xs font-semibold text-foreground">Invoice Number *</label>
              <input
                id="invNum"
                aria-label="Invoice Number"
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-2026-99"
                className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background font-mono"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="purDate" className="text-xs font-semibold text-foreground">Purchase Date *</label>
              <input
                id="purDate"
                aria-label="Purchase Date"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background"
              />
            </div>
          </div>

          {/* Line Items Repeater */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">Purchase Line Items</h4>
              <Button type="button" size="sm" variant="outline" onClick={handleAddItem} className="text-xs h-7 gap-1">
                <Plus className="h-3.5 w-3.5" /> Add Item Line
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-border rounded-lg text-xs text-muted-foreground">
                No items added. Click &quot;Add Item Line&quot; to begin recording inventory items.
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((it, idx) => (
                  <div key={it.id} className="p-2.5 rounded-lg border border-border bg-card grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-xs">
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        placeholder="Item Title"
                        value={it.title}
                        onChange={(e) => handleUpdateItem(it.id, "title", e.target.value)}
                        className="w-full h-8 px-2.5 text-xs rounded border border-input bg-background"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <input
                        type="text"
                        placeholder="SKU"
                        value={it.sku}
                        onChange={(e) => handleUpdateItem(it.id, "sku", e.target.value)}
                        className="w-full h-8 px-2.5 text-xs rounded border border-input bg-background font-mono"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        aria-label="Qty"
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={it.quantity}
                        onChange={(e) => handleUpdateItem(it.id, "quantity", Number(e.target.value))}
                        className="w-full h-8 px-2.5 text-xs rounded border border-input bg-background"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        aria-label="Unit Cost"
                        type="number"
                        min="0"
                        placeholder="Unit Cost"
                        value={it.unitCost}
                        onChange={(e) => handleUpdateItem(it.id, "unitCost", Number(e.target.value))}
                        className="w-full h-8 px-2.5 text-xs rounded border border-input bg-background font-mono"
                      />
                    </div>
                    <div className="sm:col-span-1 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(it.id)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals Summary */}
          <div className="p-3 bg-muted/40 rounded-lg space-y-1.5 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal:</span>
              <span className="font-mono font-medium">BDT {totals.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Tax / VAT:</span>
              <span className="font-mono font-medium">BDT {totals.tax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Freight / Shipping Cost:</span>
              <div className="w-24">
                <input
                  type="number"
                  min="0"
                  value={freightStr}
                  onChange={(e) => setFreightStr(e.target.value)}
                  className="w-full h-7 px-2 text-right text-xs rounded border border-input bg-background font-mono"
                />
              </div>
            </div>
            <div className="pt-2 border-t border-border flex justify-between font-bold text-sm text-foreground">
              <span>Grand Total:</span>
              <span className="font-mono text-primary">BDT {totals.grandTotal.toLocaleString()}</span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting} className="text-xs">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="text-xs">
              {submitting ? "Saving..." : "Record Direct Purchase"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
export default AddPurchaseModal;

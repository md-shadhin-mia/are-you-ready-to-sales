import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Badge,
} from "@repo/ui";
import { ArrowRight, CheckCircle2, AlertCircle, RefreshCw, Upload } from "lucide-react";

export function calculateExchangeDelta(
  returnedPrice: number,
  replacementPrice: number,
  fee: number = 120,
): number {
  return replacementPrice - returnedPrice + fee;
}

interface OrderItem {
  id: string;
  sku: string;
  title: string;
  price: number;
  quantity: number;
}

interface CatalogProduct {
  id: string;
  sku: string;
  title: string;
  basePrice: number;
  stock: number;
}

interface CreateExchangeWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (payload: any) => Promise<void> | void;
  initialOrder?: {
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    items: OrderItem[];
  };
  catalog?: CatalogProduct[];
}

export const CreateExchangeWizard: React.FC<CreateExchangeWizardProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialOrder,
  catalog = [],
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [orderNumber, setOrderNumber] = useState(initialOrder?.orderNumber || "");
  const [selectedItem, setSelectedItem] = useState<OrderItem | null>(null);
  const [defectReason, setDefectReason] = useState("SIZE_TOO_SMALL");
  const [proofPhoto, setProofPhoto] = useState<string | null>(null);
  const [selectedReplacement, setSelectedReplacement] = useState<CatalogProduct | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const exchangeFee = 120;
  const returnedPrice = selectedItem ? selectedItem.price : 0;
  const replacementPrice = selectedReplacement ? selectedReplacement.basePrice : 0;
  const priceAdjustment = calculateExchangeDelta(returnedPrice, replacementPrice, exchangeFee);

  const handleNextFromStep2 = () => {
    if (!selectedItem) {
      setErrorMsg("Please select an item to return.");
      return;
    }
    if (defectReason === "DEFECTIVE_PRODUCT" && !proofPhoto) {
      setErrorMsg("Proof photo is required for defective claims.");
      return;
    }
    setErrorMsg(null);
    setStep(3);
  };

  const handleNextFromStep3 = () => {
    if (!selectedReplacement) {
      setErrorMsg("Please select a replacement item.");
      return;
    }
    setErrorMsg(null);
    setStep(4);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onSuccess({
        originalOrderNumber: orderNumber,
        returnedItemId: selectedItem?.id,
        replacementProductId: selectedReplacement?.id,
        defectReason,
        proofPhoto,
        priceAdjustment,
        exchangeFee,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create exchange order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !submitting && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              <DialogTitle className="text-base font-bold">Create Customer Exchange</DialogTitle>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Badge variant={step === 1 ? "default" : "outline"}>1</Badge>
              <ArrowRight className="h-3 w-3" />
              <Badge variant={step === 2 ? "default" : "outline"}>2</Badge>
              <ArrowRight className="h-3 w-3" />
              <Badge variant={step === 3 ? "default" : "outline"}>3</Badge>
              <ArrowRight className="h-3 w-3" />
              <Badge variant={step === 4 ? "default" : "outline"}>4</Badge>
            </div>
          </div>
        </DialogHeader>

        {errorMsg && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-md flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: Order Lookup */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Original Order Number</label>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="e.g. ORD-94812"
                className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background font-mono"
              />
            </div>

            {initialOrder && (
              <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Customer Verified</span>
                <p className="font-semibold text-foreground">{initialOrder.customerName}</p>
                <p className="text-muted-foreground">{initialOrder.customerPhone}</p>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                onClick={() => {
                  if (!orderNumber.trim()) {
                    setErrorMsg("Order number is required");
                    return;
                  }
                  setErrorMsg(null);
                  setStep(2);
                }}
                className="text-xs"
              >
                Proceed to Items
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* STEP 2: Return Items & Defect Reason */}
        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Select Item to Return *</label>
              <div className="space-y-2">
                {(initialOrder?.items || []).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                      selectedItem?.id === item.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedItem?.id === item.id}
                        onChange={() => {}}
                        className="rounded border-border text-primary"
                      />
                      <div>
                        <p className="text-xs font-medium text-foreground">{item.title}</p>
                        <p className="text-[10px] font-mono text-muted-foreground">SKU: {item.sku}</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold">BDT {item.price}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="defectReason" className="text-xs font-semibold text-foreground">Defect Reason *</label>
              <select
                id="defectReason"
                aria-label="Defect Reason"
                value={defectReason}
                onChange={(e) => setDefectReason(e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background"
              >
                <option value="SIZE_TOO_SMALL">Size Too Small</option>
                <option value="SIZE_TOO_LARGE">Size Too Large</option>
                <option value="COLOR_MISMATCH">Color Mismatch</option>
                <option value="DEFECTIVE_PRODUCT">Defective / Damaged Product</option>
                <option value="CUSTOMER_CHANGED_MIND">Customer Changed Mind</option>
              </select>
            </div>

            {defectReason === "DEFECTIVE_PRODUCT" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Proof Photo *</label>
                <div className="border border-dashed border-border rounded-lg p-4 text-center space-y-2">
                  <Upload className="h-5 w-5 mx-auto text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Upload photo of defect</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setProofPhoto("https://cdn.example.com/defect-photo.jpg")}
                    className="text-xs h-7"
                  >
                    {proofPhoto ? "Photo Attached (Change)" : "Simulate File Upload"}
                  </Button>
                  {proofPhoto && (
                    <Badge variant="outline" className="text-[10px] text-emerald-600 block mt-1">
                      Defect evidence photo uploaded
                    </Badge>
                  )}
                </div>
              </div>
            )}

            <DialogFooter className="pt-2 flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStep(1)} className="text-xs">
                Back
              </Button>
              <Button type="button" onClick={handleNextFromStep2} className="text-xs">
                Next: Select Replacement
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* STEP 3: Replacement SKU Selection */}
        {step === 3 && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Select Replacement Product SKU *</label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {catalog.map((prod) => (
                  <div
                    key={prod.id}
                    className={`p-3 rounded-lg border flex items-center justify-between ${
                      selectedReplacement?.id === prod.id
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <div>
                      <p className="text-xs font-medium text-foreground">{prod.title}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">SKU: {prod.sku} | In Stock: {prod.stock}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold">BDT {prod.basePrice}</span>
                      <Button
                        type="button"
                        variant={selectedReplacement?.id === prod.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedReplacement(prod)}
                        className="text-xs h-7"
                      >
                        {selectedReplacement?.id === prod.id ? "Selected" : "Select Replacement SKU"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-2 flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStep(2)} className="text-xs">
                Back
              </Button>
              <Button type="button" onClick={handleNextFromStep3} className="text-xs">
                Next: Review Price Delta
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* STEP 4: Price Delta & Summary */}
        {step === 4 && (
          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/40 rounded-lg space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Original Returned Item ({selectedItem?.sku}):</span>
                <span className="font-semibold">- BDT {returnedPrice}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Replacement Item ({selectedReplacement?.sku}):</span>
                <span className="font-semibold">+ BDT {replacementPrice}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reverse & Forward Exchange Courier Fee:</span>
                <span className="font-semibold">+ BDT {exchangeFee}</span>
              </div>
              <div className="pt-2 border-t border-border flex justify-between font-bold text-sm">
                <span>{priceAdjustment >= 0 ? "Customer Pays:" : "Refund to Customer:"}</span>
                <span className={priceAdjustment >= 0 ? "text-primary" : "text-emerald-600"}>
                  BDT {Math.abs(priceAdjustment)}
                </span>
              </div>
            </div>

            <div className="p-3 border border-border rounded-lg text-xs space-y-1">
              <p className="font-semibold text-foreground">Consignment Summary:</p>
              <p className="text-muted-foreground">• Reverse Waybill: Courier will collect {selectedItem?.sku} from customer address.</p>
              <p className="text-muted-foreground">• Forward Waybill: Courier will deliver {selectedReplacement?.sku} with COD collection of BDT {Math.max(0, priceAdjustment)}.</p>
            </div>

            <DialogFooter className="pt-2 flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStep(3)} disabled={submitting} className="text-xs">
                Back
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={submitting} className="text-xs">
                {submitting ? "Processing..." : "Confirm & Dispatch Exchange"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

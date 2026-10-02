import React, { useState, useEffect } from "react";
import { apiClient, StoreProduct, FeeBreakdown } from "@repo/api-client";
import {
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Eye,
  EyeOff,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Search,
} from "lucide-react";
import { Button, Dialog, DialogContent, DialogTitle, Input, Label, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea, toast } from "@repo/ui";

interface MyProductsPageProps {
  token: string;
}

export const MyProductsPage: React.FC<MyProductsPageProps> = ({ token }) => {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);

  // Edit / Pricing Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [customTitle, setCustomTitle] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [preview, setPreview] = useState<FeeBreakdown | null>(null);
  const [updating, setUpdating] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, [token, search]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await apiClient.storeProducts.list(
        { search: search || undefined },
        token,
      );
      setProducts(res.items || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openPricingModal = async (product: StoreProduct) => {
    setSelectedProduct(product);
    setSellingPrice(Number(product.sellingPrice));
    setCustomTitle(product.customTitle || product.masterProduct.title);
    setCustomDescription(product.customDescription || product.masterProduct.masterDescription || "");
    setModalOpen(true);
    setActionMessage(null);

    // Initial pricing breakdown preview
    try {
      const calc = await apiClient.pricing.preview(
        {
          basePrice: Number(product.masterProduct.basePrice),
          sellingPrice: Number(product.sellingPrice),
        },
        token,
      );
      setPreview(calc);
    } catch {
      setPreview(null);
    }
  };

  const handlePriceChange = async (newPrice: number) => {
    setSellingPrice(newPrice);
    if (!selectedProduct) return;

    const basePrice = Number(selectedProduct.masterProduct.basePrice);
    if (newPrice >= basePrice) {
      try {
        const calc = await apiClient.pricing.preview(
          {
            basePrice,
            sellingPrice: newPrice,
          },
          token,
        );
        setPreview(calc);
      } catch {
        setPreview(null);
      }
    } else {
      setPreview(null);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setUpdating(true);

    try {
      await apiClient.storeProducts.update(
        selectedProduct.id,
        {
          sellingPrice: Number(sellingPrice),
          customTitle: customTitle.trim() || undefined,
          customDescription: customDescription.trim() || undefined,
        },
        token,
      );

      setModalOpen(false);
      loadProducts();
    } catch (err: any) {
      setActionMessage(err.message || "Failed to update product");
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleVisibility = async (product: StoreProduct) => {
    try {
      await apiClient.storeProducts.update(
        product.id,
        { isVisible: !product.isVisible },
        token,
      );
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, isVisible: !p.isVisible } : p)),
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle visibility");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to remove this product from your store?")) return;

    try {
      await apiClient.storeProducts.delete(id, token);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete product");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="My Store Products"
        description="Manage your imported reseller catalog, customize product copy, and configure retail markup margins."
        actions={
          <>
            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search my products..."
                className="w-full text-xs pl-9 pr-3.5"
              />
            </div>
          </>
        }
      />

      {/* Products Table */}
      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground flex items-center justify-center gap-2 bg-card rounded-xl border border-border">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Loading your reseller products...
        </div>
      ) : products.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-card rounded-xl border border-border p-8">
          <ShoppingBag className="h-12 w-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No products imported yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Browse the Institute Marketplace catalog to select products and start selling in your store.
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <Table className="w-full text-left text-xs text-slate-700 divide-y divide-border/60">
              <TableHeader className="bg-muted/50 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <TableRow>
                  <TableHead className="py-3.5 px-6">Product</TableHead>
                  <TableHead className="py-3.5 px-6">Base Cost</TableHead>
                  <TableHead className="py-3.5 px-6">Retail Price</TableHead>
                  <TableHead className="py-3.5 px-6">Est. Net Profit</TableHead>
                  <TableHead className="py-3.5 px-6">Status</TableHead>
                  <TableHead className="py-3.5 px-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/60 font-medium">
                {products.map((p) => {
                  const basePrice = Number(p.masterProduct.basePrice);
                  const retailPrice = Number(p.sellingPrice);
                  const grossMargin = retailPrice - basePrice;
                  const estProfit = Math.round((grossMargin - retailPrice * 0.05) * 100) / 100;
                  const img = p.customImages?.[0] || p.masterProduct.masterImages?.[0];

                  return (
                    <TableRow key={p.id} className="hover:bg-muted/50/70 transition-colors">
                      <TableCell className="py-4 px-6 flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-muted border border-border overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {img ? (
                            <img src={img} alt={p.customTitle || p.masterProduct.title} className="h-full w-full object-cover" />
                          ) : (
                            <ShoppingBag className="h-5 w-5 text-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0 max-w-xs">
                          <p className="font-bold text-foreground truncate">
                            {p.customTitle || p.masterProduct.title}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            SKU: {p.masterProduct.sku}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell className="py-4 px-6 font-semibold text-slate-600">
                        ৳{basePrice.toLocaleString()}
                      </TableCell>

                      <TableCell className="py-4 px-6 font-bold text-foreground">
                        ৳{retailPrice.toLocaleString()}
                      </TableCell>

                      <TableCell className="py-4 px-6">
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full text-xs border border-emerald-200">
                          <TrendingUp className="h-3.5 w-3.5" />
                          +৳{estProfit.toLocaleString()}
                        </span>
                      </TableCell>

                      <TableCell className="py-4 px-6">
                        <button
                          onClick={() => handleToggleVisibility(p)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${
                            p.isVisible
                              ? "bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10"
                              : "bg-muted text-muted-foreground hover:bg-slate-200"
                          }`}
                        >
                          {p.isVisible ? (
                            <>
                              <Eye className="h-3 w-3" />
                              Active
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3" />
                              Hidden
                            </>
                          )}
                        </button>
                      </TableCell>

                      <TableCell className="py-4 px-6 text-right space-x-2">
                        <button
                          onClick={() => openPricingModal(p)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Edit Pricing & Marketing Copy"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-destructive hover:bg-destructive/5 transition-colors"
                          title="Remove from Store"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Pricing & Markup Modal */}
      <Dialog open={modalOpen && !!selectedProduct} onOpenChange={(open) => !open && setModalOpen(false)}>
        <DialogContent hideClose aria-describedby={undefined} className="max-w-lg gap-0 overflow-visible border-0 bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">Pricing & Markup</DialogTitle>
          {selectedProduct && (
          <div className="bg-card rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-base text-foreground">
                  Configure Price & Margin
                </h3>
                <p className="text-xs text-muted-foreground">
                  Wholesale Base Price: <strong>৳{Number(selectedProduct.masterProduct.basePrice).toLocaleString()}</strong>
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <Label className="block text-xs font-bold text-slate-700 mb-1">
                  Retail Selling Price (৳) *
                </Label>
                <Input
                  type="number"
                  min={Number(selectedProduct.masterProduct.basePrice)}
                  required
                  value={sellingPrice}
                  onChange={(e) => handlePriceChange(Number(e.target.value))}
                  className="w-full text-sm font-bold"
                />
              </div>

              {/* Real-time Profit Calculation Breakdown Card */}
              {preview ? (
                <div className="p-4 bg-muted/50 rounded-2xl border border-border space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Wholesale Base Cost:</span>
                    <span>৳{preview.basePrice}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Platform Commission (5%):</span>
                    <span>-৳{preview.platformCommission}</span>
                  </div>
                  <div className="pt-2 border-t border-border flex justify-between font-bold text-sm text-emerald-800">
                    <span>Your Net Profit:</span>
                    <span>+৳{preview.studentNetProfit}</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  Selling price cannot be less than wholesale base price (৳{Number(selectedProduct.masterProduct.basePrice)}).
                </div>
              )}

              <div>
                <Label className="block text-xs font-bold text-slate-700 mb-1">
                  Custom Marketing Title
                </Label>
                <Input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder={selectedProduct.masterProduct.title}
                  className="w-full text-xs"
                />
              </div>

              <div>
                <Label className="block text-xs font-bold text-slate-700 mb-1">
                  Custom Sales Description
                </Label>
                <Textarea
                  rows={3}
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Add your own compelling pitch..."
                  className="w-full text-xs"
                />
              </div>

              {actionMessage && (
                <div className="p-3 bg-destructive/5 border border-destructive/20 text-xs text-destructive rounded-xl">
                  {actionMessage}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updating || !preview}
                  className="flex-1 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
                >
                  {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Pricing"}
                </Button>
              </div>
            </form>
          </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

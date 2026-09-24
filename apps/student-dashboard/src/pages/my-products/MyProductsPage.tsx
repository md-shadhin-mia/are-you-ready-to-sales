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
import { Button } from "@repo/ui";

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
      alert(err.message || "Failed to toggle visibility");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to remove this product from your store?")) return;

    try {
      await apiClient.storeProducts.delete(id, token);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete product");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            My Store Products
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your imported reseller catalog, customize product copy, and configure retail markup margins.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search my products..."
            className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500 flex items-center justify-center gap-2 bg-white rounded-3xl border border-slate-200">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          Loading your reseller products...
        </div>
      ) : products.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-slate-200 p-8">
          <ShoppingBag className="h-12 w-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No products imported yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Browse the Institute Marketplace catalog to select products and start selling in your store.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 divide-y divide-slate-100">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Product</th>
                  <th className="py-3.5 px-6">Base Cost</th>
                  <th className="py-3.5 px-6">Retail Price</th>
                  <th className="py-3.5 px-6">Est. Net Profit</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {products.map((p) => {
                  const basePrice = Number(p.masterProduct.basePrice);
                  const retailPrice = Number(p.sellingPrice);
                  const grossMargin = retailPrice - basePrice;
                  const estProfit = Math.round((grossMargin - retailPrice * 0.05) * 100) / 100;
                  const img = p.customImages?.[0] || p.masterProduct.masterImages?.[0];

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6 flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {img ? (
                            <img src={img} alt={p.customTitle || p.masterProduct.title} className="h-full w-full object-cover" />
                          ) : (
                            <ShoppingBag className="h-5 w-5 text-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0 max-w-xs">
                          <p className="font-bold text-slate-900 truncate">
                            {p.customTitle || p.masterProduct.title}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            SKU: {p.masterProduct.sku}
                          </p>
                        </div>
                      </td>

                      <td className="py-4 px-6 font-semibold text-slate-600">
                        ৳{basePrice.toLocaleString()}
                      </td>

                      <td className="py-4 px-6 font-bold text-slate-900">
                        ৳{retailPrice.toLocaleString()}
                      </td>

                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full text-xs border border-emerald-200">
                          <TrendingUp className="h-3.5 w-3.5" />
                          +৳{estProfit.toLocaleString()}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <button
                          onClick={() => handleToggleVisibility(p)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${
                            p.isVisible
                              ? "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
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
                      </td>

                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          onClick={() => openPricingModal(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          title="Edit Pricing & Marketing Copy"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Remove from Store"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pricing & Markup Modal */}
      {modalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Configure Price & Margin
                </h3>
                <p className="text-xs text-slate-500">
                  Wholesale Base Price: <strong>৳{Number(selectedProduct.masterProduct.basePrice).toLocaleString()}</strong>
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Retail Selling Price (৳) *
                </label>
                <input
                  type="number"
                  min={Number(selectedProduct.masterProduct.basePrice)}
                  required
                  value={sellingPrice}
                  onChange={(e) => handlePriceChange(Number(e.target.value))}
                  className="w-full text-sm font-bold px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Real-time Profit Calculation Breakdown Card */}
              {preview ? (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Wholesale Base Cost:</span>
                    <span>৳{preview.basePrice}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Platform Commission (5%):</span>
                    <span>-৳{preview.platformCommission}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-emerald-800">
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
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Custom Marketing Title
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder={selectedProduct.masterProduct.title}
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Custom Sales Description
                </label>
                <textarea
                  rows={3}
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Add your own compelling pitch..."
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {actionMessage && (
                <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-xl">
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
                  className="flex-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                >
                  {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Pricing"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

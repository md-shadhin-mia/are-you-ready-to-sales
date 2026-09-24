import React, { useEffect, useState } from "react";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
} from "@repo/ui";
import { apiClient, MasterProduct, PaginatedResult } from "@repo/api-client";
import {
  Search,
  Package,
  Eye,
  ShoppingBag,
  Sparkles,
  Info,
  CheckCircle,
  Loader2,
} from "lucide-react";

interface MarketplacePageProps {
  token: string;
}

export const MarketplacePage: React.FC<MarketplacePageProps> = ({ token }) => {
  const [data, setData] = useState<PaginatedResult<MasterProduct> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<MasterProduct | null>(
    null,
  );

  const loadMarketplace = async () => {
    setLoading(true);
    try {
      const res = await apiClient.studentCatalog.list(
        {
          search: search || undefined,
        },
        token,
      );
      setData(res);
    } catch (err: any) {
      alert(err.message || "Failed to load marketplace products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarketplace();
  }, [search]);

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="rounded-2xl bg-linear-to-r from-blue-700 via-blue-800 to-indigo-900 p-8 text-white shadow-md relative overflow-hidden">
        <div className="max-w-2xl relative z-10 space-y-2">
          <Badge className="bg-blue-500/30 text-blue-100 border-blue-400/30 text-[11px] mb-2">
            Central Sourcing & Logistics
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight">
            Institute Product Marketplace
          </h2>
          <p className="text-sm text-blue-100/90 leading-relaxed">
            Browse wholesale physical inventory held centrally at the institute warehouse.
            In Phase 2, import any of these products to your store, set your retail margin, and earn net profits when customers order!
          </p>
        </div>
      </div>

      {/* Search Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search wholesale products..."
            className="pl-9 bg-white"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <strong>{data?.items.length || 0}</strong> products available for reselling
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {data && data.items.length > 0 ? (
            data.items.map((prod) => (
              <Card
                key={prod.id}
                className="group flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md transition-all border-slate-200 bg-white"
              >
                <div>
                  <div className="relative aspect-square w-full bg-slate-100 overflow-hidden">
                    {prod.masterImages && prod.masterImages[0] ? (
                      <img
                        src={prod.masterImages[0]}
                        alt={prod.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-slate-400">
                        <Package className="h-10 w-10" />
                      </div>
                    )}
                    <span className="absolute top-2.5 right-2.5 bg-white/95 backdrop-blur-xs text-slate-700 text-[11px] font-semibold px-2 py-0.5 rounded-full shadow-xs border border-slate-200">
                      {prod.category?.name || "General"}
                    </span>
                  </div>

                  <div className="p-4 space-y-2">
                    <p className="text-[11px] font-mono text-slate-400">{prod.sku}</p>
                    <h3 className="font-semibold text-sm text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                      {prod.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {prod.masterDescription}
                    </p>
                  </div>
                </div>

                <div className="p-4 pt-0 border-t border-slate-100 mt-2 space-y-3">
                  <div className="flex items-center justify-between pt-3">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">
                        Wholesale Base Price
                      </p>
                      <p className="text-base font-bold text-slate-900">
                        ৳{Number(prod.basePrice).toLocaleString()}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">
                        Warehouse Stock
                      </p>
                      <p className="text-xs font-semibold text-emerald-600">
                        {prod.stockQuantity} in stock
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedProduct(prod)}
                    className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-700 hover:text-blue-600 hover:border-blue-300"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Inspect Details
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-16 text-center text-slate-400">
              <Package className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-medium">No wholesale products available yet</p>
            </div>
          )}
        </div>
      )}

      {/* Inspect Product Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-xl shadow-2xl bg-white max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <p className="text-xs font-mono text-slate-400">
                  {selectedProduct.sku}
                </p>
                <CardTitle className="text-lg font-bold">
                  {selectedProduct.title}
                </CardTitle>
              </div>
              <Badge variant="outline">{selectedProduct.category?.name}</Badge>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {selectedProduct.masterImages && selectedProduct.masterImages[0] && (
                <div className="aspect-video w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                  <img
                    src={selectedProduct.masterImages[0]}
                    alt={selectedProduct.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <p className="text-xs text-slate-500">Institute Wholesale Price</p>
                  <p className="text-lg font-bold text-slate-900">
                    ৳{Number(selectedProduct.basePrice).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Warehouse Available Stock</p>
                  <p className="text-lg font-bold text-emerald-600">
                    {selectedProduct.stockQuantity} units
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Product Description
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {selectedProduct.masterDescription}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
                <Info className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
                <span>
                  <strong>Coming in Phase 2:</strong> You will be able to import this product into your store, customize its title and images, set your retail markup (e.g. ৳{Number(selectedProduct.basePrice) + 800}), and market it to your buyers!
                </span>
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setSelectedProduct(null)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

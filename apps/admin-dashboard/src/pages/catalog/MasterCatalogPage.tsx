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
import {
  apiClient,
  MasterProduct,
  Category,
  PaginatedResult,
} from "@repo/api-client";
import {
  Plus,
  Search,
  Package,
  AlertTriangle,
  Upload,
  CheckCircle,
  Loader2,
  DollarSign,
  Layers,
} from "lucide-react";

interface MasterCatalogPageProps {
  token: string;
}

export const MasterCatalogPage: React.FC<MasterCatalogPageProps> = ({
  token,
}) => {
  const [data, setData] = useState<PaginatedResult<MasterProduct> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Add Product Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [sku, setSku] = useState("");
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("50");
  const [masterDescription, setMasterDescription] = useState("");
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);

  // Adjust Stock Modal State
  const [adjustingProduct, setAdjustingProduct] = useState<MasterProduct | null>(
    null,
  );
  const [stockDelta, setStockDelta] = useState("");
  const [stockReason, setStockReason] = useState("");
  const [savingStock, setSavingStock] = useState(false);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await apiClient.adminProducts.list(
        {
          search: search || undefined,
          categoryId: selectedCategory || undefined,
        },
        token,
      );
      setData(res);
    } catch (err: any) {
      alert(err.message || "Failed to load master products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiClient.categories.list().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    loadProducts();
  }, [search, selectedCategory]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const presigned = await apiClient.storage.getPresignedUrl(
        {
          fileName: file.name,
          contentType: file.type || "image/jpeg",
          fileSize: file.size,
        },
        token,
      );

      await apiClient.storage.uploadFile(
        presigned.uploadUrl,
        file,
        file.type || "image/jpeg",
      );

      setUploadedImageUrl(presigned.publicUrl);
    } catch (err: any) {
      alert(err.message || "Image upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) {
      alert("Please select a category");
      return;
    }

    setSavingProduct(true);
    try {
      await apiClient.adminProducts.create(
        {
          sku,
          title,
          categoryId,
          basePrice: parseFloat(basePrice),
          stockQuantity: parseInt(stockQuantity, 10),
          masterDescription,
          masterImages: uploadedImageUrl ? [uploadedImageUrl] : [],
        },
        token,
      );

      setIsAddOpen(false);
      setSku("");
      setTitle("");
      setCategoryId("");
      setBasePrice("");
      setStockQuantity("50");
      setMasterDescription("");
      setUploadedImageUrl("");
      loadProducts();
    } catch (err: any) {
      alert(err.message || "Failed to save product");
    } finally {
      setSavingProduct(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;

    setSavingStock(true);
    try {
      await apiClient.adminProducts.adjustStock(
        adjustingProduct.id,
        {
          quantityChange: parseInt(stockDelta, 10),
          reason: stockReason,
        },
        token,
      );

      setAdjustingProduct(null);
      setStockDelta("");
      setStockReason("");
      loadProducts();
    } catch (err: any) {
      alert(err.message || "Failed to adjust stock");
    } finally {
      setSavingStock(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Master Product Catalog
          </h2>
          <p className="text-sm text-slate-500">
            Centrally sourced and fulfilled products available for student reseller stores
          </p>
        </div>

        <Button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Add Master Product
        </Button>
      </div>

      {/* Search and Filters Bar */}
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or SKU..."
              className="pl-9"
            />
          </div>

          <div className="w-full md:w-64">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Catalog Table */}
      <Card className="shadow-sm border-slate-200 overflow-hidden">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Product</th>
                  <th className="px-6 py-3.5">SKU</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Wholesale Base Price</th>
                  <th className="px-6 py-3.5">Central Stock</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data && data.items.length > 0 ? (
                  data.items.map((prod) => (
                    <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 flex items-center gap-3">
                        {prod.masterImages && prod.masterImages[0] ? (
                          <img
                            src={prod.masterImages[0]}
                            alt={prod.title}
                            className="h-10 w-10 rounded-lg object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                            <Package className="h-5 w-5" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-900 line-clamp-1">
                            {prod.title}
                          </p>
                          <p className="text-xs text-slate-400 line-clamp-1">
                            {prod.masterDescription}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">
                        {prod.sku}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-700">
                        {prod.category?.name || "General"}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        ৳{Number(prod.basePrice).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            prod.stockQuantity < 20
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {prod.stockQuantity < 20 && (
                            <AlertTriangle className="h-3 w-3" />
                          )}
                          {prod.stockQuantity} units
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={prod.isActive ? "success" : "secondary"}>
                          {prod.isActive ? "Active" : "Archived"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAdjustingProduct(prod)}
                          className="text-xs"
                        >
                          Adjust Stock
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      No master products found matching your query
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Master Product Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-xl shadow-2xl bg-white max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg">Add New Master Product</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleCreateProduct} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      SKU (Unique Identifier)
                    </label>
                    <Input
                      required
                      placeholder="e.g. SKU-TECH-001"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Category
                    </label>
                    <select
                      required
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Product Title
                  </label>
                  <Input
                    required
                    placeholder="e.g. Ultra-Light Mechanical Keyboard"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Wholesale Base Price (৳ BDT)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      placeholder="e.g. 2500"
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Initial Warehouse Stock
                    </label>
                    <Input
                      type="number"
                      min="0"
                      required
                      value={stockQuantity}
                      onChange={(e) => setStockQuantity(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Master Description
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={masterDescription}
                    onChange={(e) => setMasterDescription(e.target.value)}
                    placeholder="Detailed wholesale product description for resellers..."
                    className="w-full rounded-md border border-slate-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* MinIO Image Upload Dropzone */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Product Image (Direct MinIO S3 Presigned Upload)
                  </label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
                    {uploadedImageUrl ? (
                      <div className="flex items-center justify-center gap-3">
                        <img
                          src={uploadedImageUrl}
                          alt="Uploaded"
                          className="h-16 w-16 object-cover rounded-md border border-slate-200"
                        />
                        <div className="text-left text-xs">
                          <p className="font-semibold text-emerald-600 flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" /> Uploaded to S3
                          </p>
                          <p className="text-slate-400 truncate max-w-xs font-mono">
                            {uploadedImageUrl}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                        <label className="cursor-pointer">
                          <span className="text-sm font-medium text-blue-600 hover:text-blue-500">
                            {uploadingImage ? "Uploading..." : "Click to upload an image"}
                          </span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleImageUpload}
                            className="hidden"
                            disabled={uploadingImage}
                          />
                        </label>
                        <p className="text-xs text-slate-400 mt-1">
                          PNG, JPG, or WEBP up to 5 MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={savingProduct || uploadingImage}>
                    {savingProduct ? "Saving Product..." : "Save Master Product"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-xl bg-white">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-base font-semibold">
                Adjust Inventory: {adjustingProduct.title}
              </CardTitle>
              <p className="text-xs text-slate-500">
                Current stock: <strong>{adjustingProduct.stockQuantity} units</strong>
              </p>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleAdjustStock} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Stock Change Amount (+ to add, - to subtract)
                  </label>
                  <Input
                    type="number"
                    required
                    placeholder="e.g. +25 or -10"
                    value={stockDelta}
                    onChange={(e) => setStockDelta(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Reason for Adjustment
                  </label>
                  <Input
                    required
                    placeholder="e.g. Supplier PO receipt, damaged goods write-off"
                    value={stockReason}
                    onChange={(e) => setStockReason(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAdjustingProduct(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={savingStock}>
                    {savingStock ? "Updating..." : "Confirm Stock Adjustment"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

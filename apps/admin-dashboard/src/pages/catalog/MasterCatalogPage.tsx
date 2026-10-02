import React, { useEffect, useState } from "react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Dialog, DialogContent, DialogTitle, Input, Label, NativeSelect, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea, toast } from "@repo/ui";
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
      toast.error(err.message || "Failed to load master products");
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
      toast.error(err.message || "Image upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) {
      toast("Please select a category");
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
      toast.error(err.message || "Failed to save product");
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
      toast.error(err.message || "Failed to adjust stock");
    } finally {
      setSavingStock(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Product Catalog"
        description="Centrally sourced and fulfilled products available for student reseller stores"
        actions={
          <>
            <Button
              onClick={() => setIsAddOpen(true)}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              Add Master Product
            </Button>
          </>
        }
      />

      {/* Search and Filters Bar */}
      <Card className="shadow-sm border-border">
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
            <NativeSelect containerClassName="w-full"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-sm"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        </CardContent>
      </Card>

      {/* Catalog Table */}
      <Card className="shadow-sm border-border overflow-hidden">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="w-full text-left text-sm text-slate-600">
              <TableHeader className="bg-muted/50 text-xs font-semibold uppercase text-slate-700 border-b border-border">
                <TableRow>
                  <TableHead className="px-6 py-3.5">Product</TableHead>
                  <TableHead className="px-6 py-3.5">SKU</TableHead>
                  <TableHead className="px-6 py-3.5">Category</TableHead>
                  <TableHead className="px-6 py-3.5">Wholesale Base Price</TableHead>
                  <TableHead className="px-6 py-3.5">Central Stock</TableHead>
                  <TableHead className="px-6 py-3.5">Status</TableHead>
                  <TableHead className="px-6 py-3.5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/60">
                {data && data.items.length > 0 ? (
                  data.items.map((prod) => (
                    <TableRow key={prod.id} className="hover:bg-muted/50/80 transition-colors">
                      <TableCell className="px-6 py-4 flex items-center gap-3">
                        {prod.masterImages && prod.masterImages[0] ? (
                          <img
                            src={prod.masterImages[0]}
                            alt={prod.title}
                            className="h-10 w-10 rounded-lg object-cover border border-border"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-muted border border-border flex items-center justify-center text-slate-400">
                            <Package className="h-5 w-5" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-foreground line-clamp-1">
                            {prod.title}
                          </p>
                          <p className="text-xs text-slate-400 line-clamp-1">
                            {prod.masterDescription}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 font-mono text-xs text-muted-foreground">
                        {prod.sku}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-xs font-medium text-slate-700">
                        {prod.category?.name || "General"}
                      </TableCell>
                      <TableCell className="px-6 py-4 font-semibold text-foreground">
                        ৳{Number(prod.basePrice).toLocaleString()}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            prod.stockQuantity < 20
                              ? "bg-destructive/5 text-destructive border border-destructive/20"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {prod.stockQuantity < 20 && (
                            <AlertTriangle className="h-3 w-3" />
                          )}
                          {prod.stockQuantity} units
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge variant={prod.isActive ? "success" : "secondary"}>
                          {prod.isActive ? "Active" : "Archived"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAdjustingProduct(prod)}
                          className="text-xs"
                        >
                          Adjust Stock
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      No master products found matching your query
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Add Master Product Modal */}
      <Dialog open={!!isAddOpen} onOpenChange={(open) => !open && setIsAddOpen(false)}>
        <DialogContent hideClose aria-describedby={undefined} className="max-w-xl gap-0 overflow-visible border-0 bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">Add Master Product</DialogTitle>
          <Card className="w-full max-w-xl shadow-2xl bg-card max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg">Add New Master Product</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleCreateProduct} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="block text-xs font-medium text-slate-700 mb-1">
                      SKU (Unique Identifier)
                    </Label>
                    <Input
                      required
                      placeholder="e.g. SKU-TECH-001"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label className="block text-xs font-medium text-slate-700 mb-1">
                      Category
                    </Label>
                    <NativeSelect containerClassName="w-full"
                      required
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="text-sm"
                    >
                      <option value="">Select Category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                </div>

                <div>
                  <Label className="block text-xs font-medium text-slate-700 mb-1">
                    Product Title
                  </Label>
                  <Input
                    required
                    placeholder="e.g. Ultra-Light Mechanical Keyboard"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="block text-xs font-medium text-slate-700 mb-1">
                      Wholesale Base Price (৳ BDT)
                    </Label>
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
                    <Label className="block text-xs font-medium text-slate-700 mb-1">
                      Initial Warehouse Stock
                    </Label>
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
                  <Label className="block text-xs font-medium text-slate-700 mb-1">
                    Master Description
                  </Label>
                  <Textarea
                    rows={3}
                    required
                    value={masterDescription}
                    onChange={(e) => setMasterDescription(e.target.value)}
                    placeholder="Detailed wholesale product description for resellers..."
                    className="w-full text-sm"
                  />
                </div>

                {/* MinIO Image Upload Dropzone */}
                <div>
                  <Label className="block text-xs font-medium text-slate-700 mb-1">
                    Product Image (Direct MinIO S3 Presigned Upload)
                  </Label>
                  <div className="border-2 border-dashed border-input rounded-lg p-4 text-center hover:border-primary transition-colors">
                    {uploadedImageUrl ? (
                      <div className="flex items-center justify-center gap-3">
                        <img
                          src={uploadedImageUrl}
                          alt="Uploaded"
                          className="h-16 w-16 object-cover rounded-md border border-border"
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
                        <Label className="cursor-pointer">
                          <span className="text-sm font-medium text-primary hover:text-primary">
                            {uploadingImage ? "Uploading..." : "Click to upload an image"}
                          </span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleImageUpload}
                            className="hidden"
                            disabled={uploadingImage}
                          />
                        </Label>
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
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Modal */}
      <Dialog open={!!adjustingProduct} onOpenChange={(open) => !open && setAdjustingProduct(null)}>
        <DialogContent hideClose aria-describedby={undefined} className="max-w-md gap-0 overflow-visible border-0 bg-transparent p-0 shadow-none">
            {adjustingProduct && (
            <>
          <DialogTitle className="sr-only">Adjust Stock</DialogTitle>
          <Card className="w-full max-w-md shadow-xl bg-card">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-base font-semibold">
                Adjust Inventory: {adjustingProduct.title}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Current stock: <strong>{adjustingProduct.stockQuantity} units</strong>
              </p>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleAdjustStock} className="space-y-4">
                <div>
                  <Label className="block text-xs font-medium text-slate-700 mb-1">
                    Stock Change Amount (+ to add, - to subtract)
                  </Label>
                  <Input
                    type="number"
                    required
                    placeholder="e.g. +25 or -10"
                    value={stockDelta}
                    onChange={(e) => setStockDelta(e.target.value)}
                  />
                </div>

                <div>
                  <Label className="block text-xs font-medium text-slate-700 mb-1">
                    Reason for Adjustment
                  </Label>
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
            </>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

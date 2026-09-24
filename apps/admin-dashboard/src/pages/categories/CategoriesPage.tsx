import React, { useEffect, useState } from "react";
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Badge } from "@repo/ui";
import { apiClient, Category } from "@repo/api-client";
import { Plus, FolderTree, AlertCircle, Loader2 } from "lucide-react";

interface CategoriesPageProps {
  token: string;
}

export const CategoriesPage: React.FC<CategoriesPageProps> = ({ token }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.categories.list();
      setCategories(data);
    } catch (err: any) {
      setError(err.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.categories.create(
        {
          name,
          slug,
          parentId: parentId || undefined,
        },
        token,
      );
      setIsModalOpen(false);
      setName("");
      setSlug("");
      setParentId("");
      loadCategories();
    } catch (err: any) {
      alert(err.message || "Failed to create category");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Category Taxonomy
          </h2>
          <p className="text-sm text-slate-500">
            Organize the master catalog into hierarchical departments & categories
          </p>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <Card key={cat.id} className="shadow-sm border-slate-200">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FolderTree className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-base font-semibold">{cat.name}</CardTitle>
                </div>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {cat.slug}
                </Badge>
              </CardHeader>
              <CardContent className="pt-4">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Subcategories ({cat.children?.length || 0})
                </h4>
                {cat.children && cat.children.length > 0 ? (
                  <ul className="space-y-1.5">
                    {cat.children.map((sub) => (
                      <li
                        key={sub.id}
                        className="text-sm text-slate-700 flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100"
                      >
                        <span>{sub.name}</span>
                        <span className="text-xs text-slate-400 font-mono">
                          {sub.slug}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400 italic">No subcategories</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-xl bg-white">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg">Add New Category</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Category Name
                  </label>
                  <Input
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!slug) {
                        setSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]/g, "-")
                            .replace(/-+/g, "-"),
                        );
                      }
                    }}
                    placeholder="e.g. Sports & Outdoors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    URL Slug
                  </label>
                  <Input
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="e.g. sports-outdoors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Parent Category (Optional)
                  </label>
                  <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">None (Top-Level Category)</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Saving..." : "Create Category"}
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

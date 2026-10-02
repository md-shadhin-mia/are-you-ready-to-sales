import React, { useState } from 'react';
import { Tag, Palette, Maximize, Barcode, Plus, Trash2 } from 'lucide-react';
import { Button, Badge } from '@repo/ui';

interface TaxonomyItem {
  id: string;
  name: string;
  code?: string;
  count: number;
}

export default function TaxonomyPage({ defaultTab = 'brands' }: { defaultTab?: 'brands' | 'sizes' | 'colors' | 'barcodes' }) {
  const [tab, setTab] = useState<'brands' | 'sizes' | 'colors' | 'barcodes'>(defaultTab);

  const [brands, setBrands] = useState<TaxonomyItem[]>([
    { id: 'b-1', name: 'Apex Elite', code: 'APX', count: 42 },
    { id: 'b-2', name: 'Urban Denim Co.', code: 'UDC', count: 18 },
    { id: 'b-3', name: 'Breeze Casuals', code: 'BZC', count: 29 },
  ]);

  const [sizes, setSizes] = useState<TaxonomyItem[]>([
    { id: 's-1', name: 'Small (S)', code: 'S', count: 120 },
    { id: 's-2', name: 'Medium (M)', code: 'M', count: 240 },
    { id: 's-3', name: 'Large (L)', code: 'L', count: 195 },
    { id: 's-4', name: 'Extra Large (XL)', code: 'XL', count: 85 },
  ]);

  const [colors, setColors] = useState<TaxonomyItem[]>([
    { id: 'c-1', name: 'Midnight Blue', code: '#002244', count: 65 },
    { id: 'c-2', name: 'Crisp White', code: '#FFFFFF', count: 110 },
    { id: 'c-3', name: 'Pitch Black', code: '#000000', count: 140 },
  ]);

  const [newItemName, setNewItemName] = useState('');
  const [newItemCode, setNewItemCode] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName) return;

    const item: TaxonomyItem = {
      id: `${tab}-${Date.now()}`,
      name: newItemName,
      code: newItemCode || newItemName.slice(0, 3).toUpperCase(),
      count: 0,
    };

    if (tab === 'brands') setBrands([...brands, item]);
    if (tab === 'sizes') setSizes([...sizes, item]);
    if (tab === 'colors') setColors([...colors, item]);

    setNewItemName('');
    setNewItemCode('');
  };

  const currentList = tab === 'brands' ? brands : tab === 'sizes' ? sizes : colors;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Tag className="h-6 w-6 text-primary" />
            Product Taxonomy & Barcodes
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Standardize product variant attributes, color swatches, size metrics, and Code-128 barcode generation.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setTab('brands')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            tab === 'brands' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
          }`}
        >
          <Tag className="h-4 w-4" />
          Brands ({brands.length})
        </button>
        <button
          onClick={() => setTab('sizes')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            tab === 'sizes' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
          }`}
        >
          <Maximize className="h-4 w-4" />
          Sizes ({sizes.length})
        </button>
        <button
          onClick={() => setTab('colors')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            tab === 'colors' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
          }`}
        >
          <Palette className="h-4 w-4" />
          Colors ({colors.length})
        </button>
        <button
          onClick={() => setTab('barcodes')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            tab === 'barcodes' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
          }`}
        >
          <Barcode className="h-4 w-4" />
          Barcode Generator
        </button>
      </div>

      {tab !== 'barcodes' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border uppercase font-semibold text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Code / Value</th>
                  <th className="px-4 py-3 text-right">Products Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {currentList.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-semibold text-foreground flex items-center gap-2">
                      {tab === 'colors' && item.code?.startsWith('#') && (
                        <span
                          className="h-4 w-4 rounded-full border border-border inline-block"
                          style={{ backgroundColor: item.code }}
                        />
                      )}
                      {item.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{item.code || '-'}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium">{item.count} items</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card space-y-4">
            <h3 className="text-sm font-bold text-foreground">Add New {tab.slice(0, -1).toUpperCase()}</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder={`e.g. ${tab === 'colors' ? 'Olive Green' : tab === 'sizes' ? 'XXL' : 'Gucci'}`}
                  className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  {tab === 'colors' ? 'Hex Code (#RRGGBB)' : 'Short Code'}
                </label>
                <input
                  type="text"
                  value={newItemCode}
                  onChange={(e) => setNewItemCode(e.target.value)}
                  placeholder={`e.g. ${tab === 'colors' ? '#556B2F' : 'XXL'}`}
                  className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <Button type="submit" size="sm" className="w-full text-xs">
                Add to Taxonomy
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-xl border border-border bg-card space-y-4 max-w-xl">
          <h3 className="text-sm font-bold text-foreground">Print Code-128 Barcode Labels</h3>
          <p className="text-xs text-muted-foreground">
            Generate printable thermal adhesive barcode labels (38mm x 25mm) for warehouse binning and courier scans.
          </p>
          <div className="p-4 bg-muted/40 border border-border rounded-lg flex flex-col items-center justify-center space-y-2">
            <div className="font-mono text-3xl tracking-widest font-black text-foreground">||||| | |||| ||| ||||</div>
            <div className="text-xs font-mono font-bold text-foreground">SKU-SHIRT-BLUE-L</div>
          </div>
          <Button size="sm" onClick={() => alert('Sending print job to thermal label printer...')} className="text-xs">
            Print 50 Labels
          </Button>
        </div>
      )}
    </div>
  );
}

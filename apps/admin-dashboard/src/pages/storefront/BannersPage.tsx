import React, { useState } from 'react';
import { Image, Plus, Trash2, Eye, ExternalLink } from 'lucide-react';
import {
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@repo/ui';

interface BannerItem {
  id: string;
  title: string;
  desktopImg: string;
  mobileImg: string;
  targetUrl: string;
  sortOrder: number;
  isActive: boolean;
}

const initialBanners: BannerItem[] = [
  {
    id: 'ban-1',
    title: 'Eid Mega Fest Campaign',
    desktopImg: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1920&q=80',
    mobileImg: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80',
    targetUrl: '/category/festive',
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 'ban-2',
    title: 'Student Entrepreneur Launchpad',
    desktopImg: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1920&q=80',
    mobileImg: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80',
    targetUrl: '/courses/ecom-mastery',
    sortOrder: 2,
    isActive: true,
  },
];

export default function BannersPage() {
  const [banners, setBanners] = useState<BannerItem[]>(initialBanners);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [desktopImg, setDesktopImg] = useState('');
  const [mobileImg, setMobileImg] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [sortOrder, setSortOrder] = useState('1');

  const handleAddBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !desktopImg) return;

    const newBanner: BannerItem = {
      id: `ban-${Date.now()}`,
      title,
      desktopImg,
      mobileImg: mobileImg || desktopImg,
      targetUrl,
      sortOrder: Number(sortOrder) || 1,
      isActive: true,
    };

    setBanners([...banners, newBanner]);
    setIsModalOpen(false);
    setTitle('');
    setDesktopImg('');
    setMobileImg('');
    setTargetUrl('');
  };

  const toggleActive = (id: string) => {
    setBanners(banners.map((b) => (b.id === id ? { ...b, isActive: !b.isActive } : b)));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Image className="h-6 w-6 text-primary" />
            Storefront Promotional Banners
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Curate hero sliders, responsive mobile graphics, and promotional campaign call-to-actions.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="text-xs flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add Promotional Banner
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {banners.map((banner) => (
          <div key={banner.id} className="rounded-xl border border-border bg-card overflow-hidden space-y-3">
            <div className="relative aspect-[16/6] bg-muted overflow-hidden">
              <img
                src={banner.desktopImg}
                alt={banner.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2">
                <Badge variant={banner.isActive ? 'default' : 'secondary'} className="text-[10px]">
                  {banner.isActive ? 'LIVE' : 'HIDDEN'}
                </Badge>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">{banner.title}</h3>
                <span className="text-xs font-mono text-muted-foreground">Order: #{banner.sortOrder}</span>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground truncate font-mono">
                <ExternalLink className="h-3 w-3 shrink-0" />
                {banner.targetUrl || '/'}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleActive(banner.id)}
                  className="text-xs h-7"
                >
                  {banner.isActive ? 'Hide from Storefront' : 'Publish to Storefront'}
                </Button>
                <button
                  type="button"
                  onClick={() => setBanners(banners.filter((b) => b.id !== banner.id))}
                  className="text-rose-500 hover:text-rose-400 text-xs flex items-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Banner Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleAddBanner} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Add Campaign Banner</DialogTitle>
              <p className="text-xs text-muted-foreground">
                Upload image URLs and set click-through destinations.
              </p>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Banner Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Winter Clearance Flash Sale"
                  className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Desktop Image URL (1920x600) *
                </label>
                <input
                  type="url"
                  required
                  value={desktopImg}
                  onChange={(e) => setDesktopImg(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Mobile Image URL (800x600)
                </label>
                <input
                  type="url"
                  value={mobileImg}
                  onChange={(e) => setMobileImg(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Target Action URL</label>
                  <input
                    type="text"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="/category/winter"
                    className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Display Sort Order</label>
                  <input
                    type="number"
                    min="1"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs">
                Publish Banner
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

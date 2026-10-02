import React, { useState } from 'react';
import { FileText, Save, CheckCircle2, Eye } from 'lucide-react';
import { Button } from '@repo/ui';

interface StaticPage {
  slug: string;
  title: string;
  metaTitle: string;
  metaDesc: string;
  content: string;
}

const defaultPages: Record<string, StaticPage> = {
  terms: {
    slug: 'terms-of-service',
    title: 'Terms of Service',
    metaTitle: 'Terms of Service | E-Commerce Academy',
    metaDesc: 'Terms and operating policies governing student and customer interactions.',
    content: '## 1. Introduction\nWelcome to our platform. By enrolling or ordering, you agree to these legal terms...',
  },
  privacy: {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    metaTitle: 'Privacy Policy | Data Protection',
    metaDesc: 'How customer and student personal identifiable information is securely managed.',
    content: '## Data Collection & Usage\nWe respect user privacy and only retain necessary transaction metadata...',
  },
  returns: {
    slug: 'return-policy',
    title: 'Return & Exchange Policy',
    metaTitle: 'Returns & Exchange Terms',
    metaDesc: 'Clear 7-day customer satisfaction and exchange guidelines.',
    content: '## 7-Day Exchange Window\nItems defective upon receipt may be exchanged within 7 business days...',
  },
};

export default function ManagePagesPage() {
  const [selectedKey, setSelectedKey] = useState<string>('terms');
  const [pages, setPages] = useState<Record<string, StaticPage>>(defaultPages);
  const [saved, setSaved] = useState(false);

  const currentPage = pages[selectedKey];

  const handleUpdate = (field: keyof StaticPage, val: string) => {
    setPages((prev) => ({
      ...prev,
      [selectedKey]: {
        ...prev[selectedKey],
        [field]: val,
      },
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Static Legal & Policy Pages
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Edit Terms of Service, Privacy Policies, and customer guarantee agreements with SEO metadata.
          </p>
        </div>

        {saved && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            Page updated!
          </div>
        )}
      </div>

      {/* Page Selector Tabs */}
      <div className="flex border-b border-border">
        {Object.entries(pages).map(([key, page]) => (
          <button
            key={key}
            onClick={() => setSelectedKey(key)}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              selectedKey === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            {page.title}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="p-6 rounded-xl border border-border bg-card space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                SEO Meta Title
              </label>
              <input
                type="text"
                value={currentPage.metaTitle}
                onChange={(e) => handleUpdate('metaTitle', e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Page URL Slug
              </label>
              <input
                type="text"
                disabled
                value={`/${currentPage.slug}`}
                className="w-full px-3 py-1.5 text-xs bg-muted border border-border rounded-lg text-foreground font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              SEO Meta Description
            </label>
            <input
              type="text"
              value={currentPage.metaDesc}
              onChange={(e) => handleUpdate('metaDesc', e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Markdown Page Content
            </label>
            <textarea
              rows={12}
              value={currentPage.content}
              onChange={(e) => handleUpdate('content', e.target.value)}
              className="w-full p-3 font-mono text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" size="sm" className="text-xs flex items-center gap-1.5">
            <Save className="h-4 w-4" />
            Publish Page Changes
          </Button>
        </div>
      </form>
    </div>
  );
}

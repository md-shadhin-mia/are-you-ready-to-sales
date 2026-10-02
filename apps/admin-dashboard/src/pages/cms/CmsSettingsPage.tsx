import React, { useState } from 'react';
import { Settings, Save, CheckCircle2, Globe, Phone, MessageSquare, MapPin } from 'lucide-react';
import { Button } from '@repo/ui';

export default function CmsSettingsPage() {
  const [platformName, setPlatformName] = useState('E-Commerce Academy & Commerce Cloud');
  const [tagline, setTagline] = useState('Empowering Students into High-Yield Digital Entrepreneurs');
  const [currency, setCurrency] = useState('BDT (৳)');
  const [supportPhone, setSupportPhone] = useState('+880 9612-000111');
  const [whatsappHotline, setWhatsappHotline] = useState('+880 1700-112233');
  const [officeAddress, setOfficeAddress] = useState('Level 7, Concord Tower, Panthapath, Dhaka-1205');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            General Site & Platform Settings
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Global branding identity, default currency codes, and omnichannel customer support lines.
          </p>
        </div>

        {saved && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            Changes saved successfully!
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="p-6 rounded-xl border border-border bg-card space-y-4">
          <h3 className="text-sm font-bold text-foreground">Brand Identity</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Platform Name *
              </label>
              <input
                type="text"
                required
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Default Currency
              </label>
              <input
                type="text"
                value={currency}
                disabled
                className="w-full px-3 py-1.5 text-xs bg-muted border border-border rounded-lg text-foreground font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Storefront Tagline
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="p-6 rounded-xl border border-border bg-card space-y-4">
          <h3 className="text-sm font-bold text-foreground">Omnichannel Contact & Head Office</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Official Support Phone
              </label>
              <input
                type="tel"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                WhatsApp Hotline
              </label>
              <input
                type="tel"
                value={whatsappHotline}
                onChange={(e) => setWhatsappHotline(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Head Office Physical Address
            </label>
            <input
              type="text"
              value={officeAddress}
              onChange={(e) => setOfficeAddress(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" size="sm" className="text-xs flex items-center gap-1.5">
            <Save className="h-4 w-4" />
            Save Platform Settings
          </Button>
        </div>
      </form>
    </div>
  );
}

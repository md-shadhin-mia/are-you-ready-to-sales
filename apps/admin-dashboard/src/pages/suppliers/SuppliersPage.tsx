import React, { useState } from 'react';
import { Factory, Plus, Search, Mail, Phone, MapPin, CheckCircle2 } from 'lucide-react';
import {
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@repo/ui';

interface Supplier {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  taxId: string;
  leadTimeDays: number;
  category: string;
  status: 'ACTIVE' | 'INACTIVE';
}

const initialSuppliers: Supplier[] = [
  {
    id: 'sup-1',
    companyName: 'TexStyle Fabrics Ltd',
    contactPerson: 'Rafiqul Islam',
    phone: '+880 1711-884920',
    email: 'supply@texstyle.com.bd',
    address: 'Plot 42, Export Processing Zone, Savar, Dhaka',
    taxId: 'TIN-88201948201',
    leadTimeDays: 7,
    category: 'Men & Women Apparel',
    status: 'ACTIVE',
  },
  {
    id: 'sup-2',
    companyName: 'Bengal Footwear Corp',
    contactPerson: 'Anisur Rahman',
    phone: '+880 1819-204918',
    email: 'info@bengalfootwear.bd',
    address: 'Kalyanpur Industrial Estate, Dhaka',
    taxId: 'TIN-44910293810',
    leadTimeDays: 14,
    category: 'Leather Footwear',
    status: 'ACTIVE',
  },
];

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState('7');
  const [category, setCategory] = useState('Apparel & Textiles');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !phone) return;

    const newSupplier: Supplier = {
      id: `sup-${Date.now()}`,
      companyName,
      contactPerson,
      phone,
      email,
      address,
      taxId,
      leadTimeDays: Number(leadTimeDays) || 7,
      category,
      status: 'ACTIVE',
    };

    setSuppliers([newSupplier, ...suppliers]);
    setIsModalOpen(false);
    setCompanyName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setAddress('');
    setTaxId('');
  };

  const filtered = suppliers.filter(
    (s) =>
      s.companyName.toLowerCase().includes(search.toLowerCase()) ||
      s.contactPerson.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Factory className="h-6 w-6 text-primary" />
            Suppliers Directory
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Registered manufacturing partners, factory addresses, tax compliance, and fulfillment lead times.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="text-xs flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add Supplier
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search suppliers by name or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b border-border uppercase font-semibold text-muted-foreground tracking-wider">
              <tr>
                <th className="px-4 py-3">Supplier Company</th>
                <th className="px-4 py-3">Contact Person</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Tax TIN</th>
                <th className="px-4 py-3 text-center">Avg Lead Time</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-foreground">{s.companyName}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {s.address}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <div className="font-medium text-foreground">{s.contactPerson}</div>
                    <div className="text-[11px]">{s.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-foreground">{s.category}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground text-[11px]">{s.taxId}</td>
                  <td className="px-4 py-3 text-center font-mono font-semibold">{s.leadTimeDays} days</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="default" className="text-[10px]">
                      {s.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Supplier Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleRegister} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Register New Supplier</DialogTitle>
              <p className="text-xs text-muted-foreground">
                Enter vendor manufacturing credentials and fulfillment lead times.
              </p>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Apex Spinning & Weaving Ltd"
                  className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Primary Contact *</label>
                  <input
                    type="text"
                    required
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Contact Manager"
                    className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+880 17..."
                    className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="info@supplier.com"
                    className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Tax TIN</label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="TIN-XXXXXXXX"
                    className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Factory Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Factory road, zone, district"
                  className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Lead Time (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={leadTimeDays}
                    onChange={(e) => setLeadTimeDays(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Category Sourced</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
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
                Register Supplier
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

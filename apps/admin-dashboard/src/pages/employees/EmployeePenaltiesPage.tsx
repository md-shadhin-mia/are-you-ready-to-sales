import React, { useState } from 'react';
import {
  AlertOctagon,
  PlusCircle,
  Search,
  FileWarning,
} from 'lucide-react';
import {
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@repo/ui';

interface Penalty {
  id: string;
  employeeName: string;
  infractionCode: 'UNEXCUSED_ABSENCE' | 'CUSTOMER_POLICY_VIOLATION' | 'INVENTORY_NEGLIGENCE' | 'OTHER';
  amount: number;
  month: string;
  notes: string;
  date: string;
}

const initialPenalties: Penalty[] = [
  {
    id: 'pen-1',
    employeeName: 'Tanvir Hossain',
    infractionCode: 'UNEXCUSED_ABSENCE',
    amount: 1000,
    month: '2026-09',
    notes: 'Consecutive unauthorized leave without notice.',
    date: '2026-09-18',
  },
  {
    id: 'pen-2',
    employeeName: 'Kamrul Hasan',
    infractionCode: 'INVENTORY_NEGLIGENCE',
    amount: 500,
    month: '2026-09',
    notes: 'Mishandling box parcel resulting in outer damage.',
    date: '2026-09-21',
  },
];

export default function EmployeePenaltiesPage() {
  const [penalties, setPenalties] = useState<Penalty[]>(initialPenalties);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  // New penalty form
  const [employeeName, setEmployeeName] = useState('Tanvir Hossain');
  const [infractionCode, setInfractionCode] = useState<Penalty['infractionCode']>('UNEXCUSED_ABSENCE');
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState('2026-09');
  const [notes, setNotes] = useState('');

  const handleCreatePenalty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    const newPen: Penalty = {
      id: `pen-${Date.now()}`,
      employeeName,
      infractionCode,
      amount: Number(amount) || 0,
      month,
      notes,
      date: new Date().toISOString().slice(0, 10),
    };

    setPenalties((prev) => [newPen, ...prev]);
    setIsLogModalOpen(false);
    setAmount('');
    setNotes('');
  };

  const filtered = penalties.filter(
    (p) =>
      p.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.infractionCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.notes.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <AlertOctagon className="h-6 w-6 text-rose-500" />
            Fines & Disciplinary Penalties
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Log documented disciplinary policy violations and deduction amounts applied against monthly payroll.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsLogModalOpen(true)}
          className="text-xs flex items-center gap-1.5"
        >
          <PlusCircle className="h-4 w-4" />
          Log Disciplinary Fine
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by employee or infraction..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b border-border uppercase font-semibold text-muted-foreground tracking-wider">
              <tr>
                <th className="px-4 py-3">Employee Name</th>
                <th className="px-4 py-3">Infraction Code</th>
                <th className="px-4 py-3 text-right">Deduction Amount</th>
                <th className="px-4 py-3">Payroll Month</th>
                <th className="px-4 py-3">Documented Reason / Evidence</th>
                <th className="px-4 py-3">Logged Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-semibold text-foreground">{item.employeeName}</td>
                  <td className="px-4 py-3">
                    <Badge variant="destructive" className="text-[10px]">
                      {item.infractionCode}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-rose-500">
                    -BDT {item.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono">{item.month}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.notes}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-[11px]">{item.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Penalty Dialog */}
      <Dialog open={isLogModalOpen} onOpenChange={setIsLogModalOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCreatePenalty} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Log Disciplinary Penalty</DialogTitle>
              <p className="text-xs text-muted-foreground">
                Apply a payroll deduction with documented violation reasons.
              </p>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Employee *</label>
                <select
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Tanvir Hossain">Tanvir Hossain (Sales)</option>
                  <option value="Nusrat Jahan">Nusrat Jahan (Fulfillment)</option>
                  <option value="Kamrul Hasan">Kamrul Hasan (Dispatch)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Infraction Code *</label>
                <select
                  value={infractionCode}
                  onChange={(e) => setInfractionCode(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="UNEXCUSED_ABSENCE">Unexcused Absence</option>
                  <option value="CUSTOMER_POLICY_VIOLATION">Customer Policy Violation</option>
                  <option value="INVENTORY_NEGLIGENCE">Inventory Negligence</option>
                  <option value="OTHER">Other Disciplinary Code</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Deduction (BDT) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="1000"
                    className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Payroll Month</label>
                  <input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Documented Evidence Notes *</label>
                <textarea
                  rows={2}
                  required
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detail the infraction incident..."
                  className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsLogModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" variant="destructive" size="sm" className="text-xs">
                Log Penalty
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

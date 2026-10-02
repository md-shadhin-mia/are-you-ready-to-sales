import React, { useState } from 'react';
import {
  Banknote,
  Lock,
  Download,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Building,
  DollarSign,
  FileSpreadsheet,
} from 'lucide-react';
import { Button, Badge } from '@repo/ui';

interface SalaryRecord {
  id: string;
  name: string;
  branch: string;
  designation: string;
  baseSalary: number;
  commissions: number;
  penalties: number;
  bankRoutingCode: string;
  accountNumber: string;
}

const initialRecords: SalaryRecord[] = [
  {
    id: 'emp-1',
    name: 'Tanvir Hossain',
    branch: 'Dhanmondi Branch',
    designation: 'Senior Sales Executive',
    baseSalary: 35000,
    commissions: 5000,
    penalties: 1000,
    bankRoutingCode: 'BRAC-028491',
    accountNumber: '1501203948201',
  },
  {
    id: 'emp-2',
    name: 'Nusrat Jahan',
    branch: 'Uttara Hub',
    designation: 'Fulfillment Supervisor',
    baseSalary: 42000,
    commissions: 3200,
    penalties: 0,
    bankRoutingCode: 'EBL-102948',
    accountNumber: '1102938472910',
  },
  {
    id: 'emp-3',
    name: 'Kamrul Hasan',
    branch: 'Chittagong Branch',
    designation: 'Lead Dispatch Officer',
    baseSalary: 28000,
    commissions: 4500,
    penalties: 500,
    bankRoutingCode: 'CITY-992019',
    accountNumber: '2201928374619',
  },
];

export default function SalarySheetPage() {
  const [selectedMonth, setSelectedMonth] = useState('2026-09');
  const [records, setRecords] = useState<SalaryRecord[]>(initialRecords);
  const [isLocked, setIsLocked] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handlePenaltyChange = (id: string, newPenaltyStr: string) => {
    const val = Number(newPenaltyStr) || 0;
    setRecords((prev) =>
      prev.map((rec) => (rec.id === id ? { ...rec, penalties: Math.max(0, val) } : rec))
    );
  };

  const handleFinalize = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmLock = () => {
    setIsLocked(true);
    setShowConfirmModal(false);
  };

  const totalBase = records.reduce((sum, r) => sum + r.baseSalary, 0);
  const totalCommissions = records.reduce((sum, r) => sum + r.commissions, 0);
  const totalPenalties = records.reduce((sum, r) => sum + r.penalties, 0);
  const totalNet = totalBase + totalCommissions - totalPenalties;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Banknote className="h-6 w-6 text-primary" />
            Monthly Salary Sheet & Payroll
            {isLocked && (
              <Badge data-testid="payroll-locked-badge" variant="destructive" className="ml-2 font-bold flex items-center gap-1">
                <Lock className="h-3 w-3" />
                LOCKED
              </Badge>
            )}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Automated net compensation auditing: Base Salary + Approved Commissions - Penalties.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-card border border-border px-3 py-1.5 rounded-lg text-xs">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input
              type="month"
              value={selectedMonth}
              disabled={isLocked}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-foreground text-xs focus:outline-none"
            />
          </div>

          <Button
            size="sm"
            disabled={isLocked}
            onClick={handleFinalize}
            className="text-xs flex items-center gap-1.5"
          >
            <Lock className="h-4 w-4" />
            Finalize & Lock Payroll
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => alert('Exporting payroll wire file for corporate banking...')}
            className="text-xs flex items-center gap-1.5"
          >
            <Download className="h-4 w-4" />
            Export Wire File
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="text-xs text-muted-foreground">Total Base Salaries</div>
          <div className="text-xl font-bold text-foreground mt-1">BDT {totalBase.toLocaleString()}</div>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="text-xs text-emerald-500 font-semibold">+ Approved Commissions</div>
          <div className="text-xl font-bold text-emerald-500 mt-1">BDT {totalCommissions.toLocaleString()}</div>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="text-xs text-rose-500 font-semibold">- Penalties & Deductions</div>
          <div className="text-xl font-bold text-rose-500 mt-1">BDT {totalPenalties.toLocaleString()}</div>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="text-xs text-primary font-bold">Total Net Payout</div>
          <div className="text-xl font-black text-primary mt-1">BDT {totalNet.toLocaleString()}</div>
        </div>
      </div>

      {/* Salary Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b border-border uppercase font-semibold text-muted-foreground tracking-wider">
              <tr>
                <th className="px-4 py-3">Employee & Designation</th>
                <th className="px-4 py-3">Campus Branch</th>
                <th className="px-4 py-3 text-right">Base Salary</th>
                <th className="px-4 py-3 text-right text-emerald-500">+ Commissions</th>
                <th className="px-4 py-3 text-right text-rose-500">- Penalty / Fines</th>
                <th className="px-4 py-3 text-right font-bold text-foreground">Net Payable</th>
                <th className="px-4 py-3">Bank Routing & Account</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {records.map((rec) => {
                const net = rec.baseSalary + rec.commissions - rec.penalties;
                return (
                  <tr key={rec.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">{rec.name}</div>
                      <div className="text-[11px] text-muted-foreground">{rec.designation}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{rec.branch}</td>
                    <td className="px-4 py-3 text-right font-mono text-foreground">
                      BDT {rec.baseSalary.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-emerald-500">
                      +BDT {rec.commissions.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        data-testid={`penalty-input-${rec.id}`}
                        min="0"
                        disabled={isLocked}
                        value={rec.penalties}
                        onChange={(e) => handlePenaltyChange(rec.id, e.target.value)}
                        className="w-24 px-2 py-1 text-right bg-background border border-border rounded font-mono text-rose-500 font-semibold focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-black text-foreground">
                      BDT <span data-testid={`net-salary-${rec.id}`}>{net.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground text-[11px]">
                      <div>{rec.bankRoutingCode}</div>
                      <div className="text-[10px] text-muted-foreground/80">{rec.accountNumber}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={isLocked ? 'destructive' : 'secondary'} className="text-[10px]">
                        {isLocked ? 'LOCKED' : 'DRAFT'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-500">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-base font-bold text-foreground">Finalize Payroll for {selectedMonth}?</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Locking this payroll will freeze all lead commissions and penalty deductions. No further edits can be
              made without Super-Admin override authorization.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfirmModal(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmLock}
                className="text-xs"
              >
                Confirm Lock
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

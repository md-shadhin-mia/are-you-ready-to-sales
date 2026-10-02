import React, { useState } from 'react';
import { Award, CheckCircle2, Search, Filter } from 'lucide-react';
import { Button, Badge } from '@repo/ui';

interface Commission {
  id: string;
  employeeName: string;
  leadReference: string;
  studentName: string;
  courseTitle: string;
  amount: number;
  date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

const initialCommissions: Commission[] = [
  {
    id: 'comm-1',
    employeeName: 'Tanvir Hossain',
    leadReference: 'LEAD-99201',
    studentName: 'Ahsan Habib',
    courseTitle: 'Full-Stack E-Commerce Mastery',
    amount: 1500,
    date: '2026-09-25',
    status: 'PENDING',
  },
  {
    id: 'comm-2',
    employeeName: 'Tanvir Hossain',
    leadReference: 'LEAD-99204',
    studentName: 'Sadia Afroz',
    courseTitle: 'Digital Marketing & Sales Funnels',
    amount: 1200,
    date: '2026-09-26',
    status: 'APPROVED',
  },
  {
    id: 'comm-3',
    employeeName: 'Kamrul Hasan',
    leadReference: 'LEAD-88402',
    studentName: 'Mehedi Hasan',
    courseTitle: 'Full-Stack E-Commerce Mastery',
    amount: 1500,
    date: '2026-09-27',
    status: 'PENDING',
  },
];

export default function EmployeeCommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>(initialCommissions);
  const [searchQuery, setSearchQuery] = useState('');

  const handleApprove = (id: string) => {
    setCommissions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'APPROVED' } : c))
    );
  };

  const handleReject = (id: string) => {
    setCommissions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'REJECTED' } : c))
    );
  };

  const filtered = commissions.filter(
    (c) =>
      c.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.leadReference.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Award className="h-6 w-6 text-emerald-500" />
            Lead Sales Commissions
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Review and authorize incentive commissions earned by sales executives for successful student enrollments.
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by executive or lead..."
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
                <th className="px-4 py-3">Sales Executive</th>
                <th className="px-4 py-3">Lead Ref</th>
                <th className="px-4 py-3">Enrolled Student & Course</th>
                <th className="px-4 py-3 text-right">Commission Amount</th>
                <th className="px-4 py-3">Logged Date</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-semibold text-foreground">{item.employeeName}</td>
                  <td className="px-4 py-3 font-mono text-primary">{item.leadReference}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{item.studentName}</div>
                    <div className="text-[11px] text-muted-foreground">{item.courseTitle}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-emerald-500">
                    +BDT {item.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono">{item.date}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge
                      variant={
                        item.status === 'APPROVED'
                          ? 'default'
                          : item.status === 'PENDING'
                          ? 'secondary'
                          : 'destructive'
                      }
                      className="text-[10px]"
                    >
                      {item.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.status === 'PENDING' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleApprove(item.id)}
                          className="h-7 text-xs text-emerald-500 hover:text-emerald-400"
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleReject(item.id)}
                          className="h-7 text-xs text-rose-500 hover:text-rose-400"
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-[11px]">Settled</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

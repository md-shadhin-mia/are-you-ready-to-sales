import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Building,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  DollarSign,
  ShieldCheck,
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

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  branch: string;
  designation: string;
  baseSalary: number;
  joiningDate: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED';
}

const initialEmployees: Employee[] = [
  {
    id: 'emp-1',
    name: 'Tanvir Hossain',
    email: 'tanvir.h@academy.edu.bd',
    phone: '+880 1711-234567',
    branch: 'Dhanmondi Branch',
    designation: 'Senior Sales Executive',
    baseSalary: 35000,
    joiningDate: '2024-03-15',
    status: 'ACTIVE',
  },
  {
    id: 'emp-2',
    name: 'Nusrat Jahan',
    email: 'nusrat.j@academy.edu.bd',
    phone: '+880 1819-876543',
    branch: 'Uttara Hub',
    designation: 'Fulfillment Supervisor',
    baseSalary: 42000,
    joiningDate: '2023-11-01',
    status: 'ACTIVE',
  },
  {
    id: 'emp-3',
    name: 'Kamrul Hasan',
    email: 'kamrul.h@academy.edu.bd',
    phone: '+880 1912-345678',
    branch: 'Chittagong Branch',
    designation: 'Lead Dispatch Officer',
    baseSalary: 28000,
    joiningDate: '2025-01-10',
    status: 'ACTIVE',
  },
];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New employee form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [branch, setBranch] = useState('Dhanmondi Branch');
  const [designation, setDesignation] = useState('Sales Executive');
  const [baseSalary, setBaseSalary] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().slice(0, 10));

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !baseSalary) return;

    const newEmp: Employee = {
      id: `emp-${Date.now()}`,
      name,
      email,
      phone,
      branch,
      designation,
      baseSalary: Number(baseSalary) || 0,
      joiningDate,
      status: 'ACTIVE',
    };

    setEmployees((prev) => [newEmp, ...prev]);
    setIsAddModalOpen(false);
    setName('');
    setEmail('');
    setPhone('');
    setBaseSalary('');
  };

  const filteredEmployees = employees.filter((emp) =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.branch.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.designation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Employees Directory
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage staff profiles, campus branch designations, and employment status.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsAddModalOpen(true)}
          className="text-xs flex items-center gap-1.5"
        >
          <UserPlus className="h-4 w-4" />
          Add Employee
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search employees by name, email, branch..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Directory Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b border-border uppercase font-semibold text-muted-foreground tracking-wider">
              <tr>
                <th className="px-4 py-3">Employee Name</th>
                <th className="px-4 py-3">Contact Information</th>
                <th className="px-4 py-3">Campus Branch</th>
                <th className="px-4 py-3">Designation</th>
                <th className="px-4 py-3 text-right">Base Salary</th>
                <th className="px-4 py-3">Joining Date</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-foreground">{emp.name}</div>
                    <div className="text-[10px] text-muted-foreground">ID: {emp.id}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <div>{emp.email}</div>
                    <div className="text-[11px] text-muted-foreground/80">{emp.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-foreground">{emp.branch}</td>
                  <td className="px-4 py-3 text-muted-foreground font-medium">{emp.designation}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">
                    BDT {emp.baseSalary.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-[11px]">{emp.joiningDate}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="default" className="text-[10px]">
                      {emp.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleAddEmployee} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Add New Employee</DialogTitle>
              <p className="text-xs text-muted-foreground">
                Register a new staff member to a campus branch with designation and salary.
              </p>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Shakib Al Hasan"
                  className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="official@academy.edu.bd"
                    className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+880 17..."
                    className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Campus Branch</label>
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="Dhanmondi Branch">Dhanmondi Branch</option>
                    <option value="Uttara Hub">Uttara Hub</option>
                    <option value="Chittagong Branch">Chittagong Branch</option>
                    <option value="Sylhet Campus">Sylhet Campus</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Designation</label>
                  <select
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="Sales Executive">Sales Executive</option>
                    <option value="Senior Sales Executive">Senior Sales Executive</option>
                    <option value="Fulfillment Supervisor">Fulfillment Supervisor</option>
                    <option value="Lead Dispatch Officer">Lead Dispatch Officer</option>
                    <option value="Branch Manager">Branch Manager</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Base Salary (BDT) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={baseSalary}
                    onChange={(e) => setBaseSalary(e.target.value)}
                    placeholder="30000"
                    className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
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
                onClick={() => setIsAddModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs">
                Save Employee
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

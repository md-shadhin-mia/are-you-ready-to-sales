import React, { useState, useEffect } from "react";
import { apiClient, Customer } from "@repo/api-client";
import {
  Users,
  Search,
  Phone,
  Mail,
  ShoppingBag,
  TrendingUp,
  Loader2,
  Calendar,
  X,
} from "lucide-react";

interface StudentCrmPageProps {
  token: string;
}

export const StudentCrmPage: React.FC<StudentCrmPageProps> = ({ token }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerDetail, setCustomerDetail] = useState<Customer | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, [token, search]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await apiClient.crm.list(
        { search: search || undefined },
        token,
      );
      setCustomers(res.items || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = async (c: Customer) => {
    setSelectedCustomer(c);
    setLoadingDetail(true);
    try {
      const data = await apiClient.crm.get(c.id, token);
      setCustomerDetail(data);
    } catch {
      setCustomerDetail(c);
    } finally {
      setLoadingDetail(false);
    }
  };

  const totalCustomers = customers.length;
  const totalLifetimeSpend = customers.reduce(
    (sum, c) => sum + Number(c.totalSpend || 0),
    0,
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Store Customers
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {totalCustomers}
            </h3>
          </div>
          <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Customer Lifetime Spend
            </p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">
              ৳{totalLifetimeSpend.toLocaleString()}
            </h3>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Customer Directory (CRM)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Your store's private customer base with purchasing records, contact info, and lifetime value.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or phone..."
            className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
      </div>

      {/* Customer Table */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500 flex items-center justify-center gap-2 bg-white rounded-3xl border border-slate-200">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          Loading store customer directory...
        </div>
      ) : customers.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-slate-200 p-8">
          <Users className="h-12 w-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No customers registered yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Customers who complete checkout on your storefront will automatically be registered to your store's private CRM.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 divide-y divide-slate-100">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Customer Name</th>
                  <th className="py-3.5 px-6">Phone Number</th>
                  <th className="py-3.5 px-6">Email Address</th>
                  <th className="py-3.5 px-6">Total Orders</th>
                  <th className="py-3.5 px-6">Lifetime Spend</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-900">
                      {c.fullName}
                    </td>

                    <td className="py-4 px-6 font-mono text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-slate-400" />
                        {c.phone}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-slate-500">
                      {c.email ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Mail className="h-3 w-3 text-slate-400" />
                          {c.email}
                        </span>
                      ) : (
                        <span className="text-slate-300 italic">None provided</span>
                      )}
                    </td>

                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full text-xs border border-blue-200">
                        <ShoppingBag className="h-3 w-3" />
                        {c.totalOrdersCount} {c.totalOrdersCount === 1 ? "order" : "orders"}
                      </span>
                    </td>

                    <td className="py-4 px-6 font-extrabold text-slate-900">
                      ৳{Number(c.totalSpend).toLocaleString()}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleOpenDetail(c)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-300 hover:bg-slate-100 transition-colors"
                      >
                        View Orders
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer Orders Drawer / Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  {selectedCustomer.fullName}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Phone: {selectedCustomer.phone}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  setCustomerDetail(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-slate-500">Total Orders</p>
                  <p className="text-base font-bold text-slate-900 mt-1">
                    {selectedCustomer.totalOrdersCount}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-slate-500">Lifetime Spend</p>
                  <p className="text-base font-bold text-emerald-700 mt-1">
                    ৳{Number(selectedCustomer.totalSpend).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-2">Order History</h4>
                {loadingDetail ? (
                  <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    Loading orders...
                  </div>
                ) : customerDetail?.orders && customerDetail.orders.length > 0 ? (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                    {customerDetail.orders.map((o) => (
                      <div key={o.id} className="p-3 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-mono font-bold text-slate-900">{o.orderNumber}</p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(o.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900">
                            ৳{Number(o.totalAmount).toLocaleString()}
                          </p>
                          <span className="text-[10px] font-semibold text-blue-600">
                            {o.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl">
                    No individual orders loaded.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

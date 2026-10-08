"use client";

import * as React from "react";
import { Search, UserCheck, CreditCard, ShoppingBag, Eye, Phone, Mail, MapPin } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CustomerCard } from "./customer-card";
import { CustomerDetailModal, CustomerAccount } from "./customer-detail-modal";

interface CustomersManagerProps {
  customers: CustomerAccount[];
}

export function CustomersManager({ customers }: CustomersManagerProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedCustomer, setSelectedCustomer] = React.useState<CustomerAccount | null>(null);

  const filteredCustomers = React.useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return customers;
    return customers.filter(
      (c) =>
        c.full_name.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term) ||
        c.phone.toLowerCase().includes(term) ||
        c.address.toLowerCase().includes(term)
    );
  }, [customers, searchTerm]);

  const totalSpentAcrossAll = customers.reduce(
    (acc, c) => acc + c.orders.reduce((sum, o) => sum + o.total_amount, 0),
    0
  );
  const repeatCount = customers.filter((c) => c.orders.length > 1).length;

  return (
    <div className="space-y-6">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Customer Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit customer profiles, lifetime orders, reviews, and Stripe payment histories.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, phone..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <UserCheck className="h-4 w-4 text-primary" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Accounts</span>
          </div>
          <span className="text-2xl font-black text-slate-900 block">{customers.length}</span>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">Verified Customer Profiles</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <ShoppingBag className="h-4 w-4 text-hero-amber" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Repeat Customers</span>
          </div>
          <span className="text-2xl font-black text-slate-900 block">{repeatCount}</span>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">{Math.round((repeatCount / Math.max(customers.length, 1)) * 100)}% Retention Rate</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <CreditCard className="h-4 w-4 text-emerald-600" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Lifetime Revenue</span>
          </div>
          <span className="text-2xl font-black text-emerald-600 block">{formatCurrency(totalSpentAcrossAll)}</span>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">Cumulative Stripe Billings</span>
        </div>
      </div>

      {/* Desktop Customers Table */}
      <div className="hidden lg:block rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[880px] text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5 whitespace-nowrap">Customer</th>
                <th className="p-3.5 whitespace-nowrap">Contact Details</th>
                <th className="p-3.5 min-w-[180px]">Address</th>
                <th className="p-3.5 whitespace-nowrap">Orders</th>
                <th className="p-3.5 whitespace-nowrap">Total Spent</th>
                <th className="p-3.5 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                    No customers match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const custTotalSpent = cust.orders.reduce((sum, o) => sum + o.total_amount, 0);

                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-800 font-black flex items-center justify-center text-xs shrink-0">
                            {cust.full_name.charAt(0)}
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => setSelectedCustomer(cust)}
                              className="font-bold text-slate-900 hover:text-primary transition-colors text-left cursor-pointer"
                            >
                              {cust.full_name}
                            </button>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              ID: {cust.id} • Joined {cust.joined_date}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 space-y-1 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                          <a href={`mailto:${cust.email}`} className="hover:text-primary truncate max-w-45">
                            {cust.email}
                          </a>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                          <a href={`tel:${cust.phone}`} className="hover:text-primary font-medium">
                            {cust.phone}
                          </a>
                        </div>
                      </td>

                      <td className="p-3.5 min-w-[180px] max-w-xs truncate text-slate-600 font-medium">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                          <span className="truncate">{cust.address}</span>
                        </div>
                      </td>

                      <td className="p-3.5 font-bold text-slate-800 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-semibold text-[11px]">
                          {cust.orders.length}
                        </span>
                      </td>

                      <td className="p-3.5 font-extrabold text-slate-900 whitespace-nowrap">
                        {formatCurrency(custTotalSpent)}
                      </td>

                      <td className="p-3.5 text-right whitespace-nowrap min-w-[120px]">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs text-slate-700 hover:text-primary"
                          onClick={() => setSelectedCustomer(cust)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1 shrink-0" />
                          View Profile
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile & Tablet Card View (No Horizontal Scroll) */}
      <div className="lg:hidden space-y-3">
        {filteredCustomers.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white border border-slate-200 text-slate-400 italic text-xs">
            No customers match your search criteria.
          </div>
        ) : (
          filteredCustomers.map((cust) => (
            <CustomerCard
              key={cust.id}
              customer={cust}
              onSelectCustomer={(c) => setSelectedCustomer(c)}
            />
          ))
        )}
      </div>

      {/* Customer Full Detail & History Modal */}
      <CustomerDetailModal
        customer={selectedCustomer}
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
      />
    </div>
  );
}

export default CustomersManager;

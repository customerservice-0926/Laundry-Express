"use client";

import * as React from "react";
import { CreditCard, Search, Filter, DollarSign, TrendingUp, AlertCircle, Calendar, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { Order, AdminPaymentTransaction } from "@/types";

interface TransactionsManagerProps {
  orders?: Order[];
}

export function TransactionsManager({ orders }: TransactionsManagerProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [dateRange, setDateRange] = React.useState<"all" | "today" | "week" | "month" | "year">("month");

  const transactions: AdminPaymentTransaction[] = React.useMemo(() => {
    if (!orders || orders.length === 0) return [];
    return orders.map((o) => ({
      id: `txn-${o.id}`,
      order_id: o.id,
      order_number: o.order_number,
      customer_name: o.customer_name || o.user?.full_name || "Customer",
      customer_email: o.customer_email || "customer@example.com",
      amount: o.total_amount,
      status: o.payment_status === "paid" ? "succeeded"
        : o.payment_status === "refunded" ? "refunded"
          : o.payment_status === "failed" ? "failed" : "pending",
      date: o.created_at || new Date().toISOString(),
      method: o.payment_method === "card" ? "Credit Card" : o.payment_method === "apple_pay" ? "Apple Pay" : o.payment_method === "google_pay" ? "Google Pay" : "Stripe Secured",
      card_last4: o.payment_method === "card" ? "Card" : "",
      stripe_payment_intent: o.stripe_payment_intent || "Stripe Secured",
    }));
  }, [orders]);

  const filteredTransactions = React.useMemo(() => {
    return transactions.filter((txn) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = txn.customer_name.toLowerCase().includes(q) || txn.customer_email.toLowerCase().includes(q) || txn.order_number.toLowerCase().includes(q) || txn.stripe_payment_intent.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || txn.status === statusFilter;
      let matchesDate = true;
      if (dateRange !== "all") {
        const now = new Date();
        const txTime = new Date(txn.date).getTime();
        if (!isNaN(txTime)) {
          if (dateRange === "today") {
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            matchesDate = txTime >= startOfToday && txTime <= startOfToday + 86400000 - 1;
          } else if (dateRange === "week") matchesDate = txTime >= now.getTime() - 7 * 86400000;
          else if (dateRange === "month") matchesDate = txTime >= now.getTime() - 30 * 86400000;
          else if (dateRange === "year") matchesDate = txTime >= now.getTime() - 365 * 86400000;
        }
      }
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [transactions, searchTerm, statusFilter, dateRange]);

  const totalRevenue = filteredTransactions.filter((t) => t.status === "succeeded").reduce((acc, t) => acc + t.amount, 0);
  const totalRefunds = filteredTransactions.filter((t) => t.status === "refunded").reduce((acc, t) => acc + t.amount, 0);
  const pendingCount = filteredTransactions.filter((t) => t.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filtered Revenue</span>
            <p className="text-2xl font-black text-slate-900">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Refunds Issued</span>
            <p className="text-2xl font-black text-rose-600">{formatCurrency(totalRefunds)}</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Stripe Holds</span>
            <p className="text-2xl font-black text-amber-600">{pendingCount}</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertCircle className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar with Dropdowns */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer, order #, or PI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Timeframe Dropdown */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="tx-date-range" className="text-xs font-bold text-slate-500 flex items-center gap-1 whitespace-nowrap">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>Timeframe:</span>
            </label>
            <div className="relative">
              <select
                id="tx-date-range"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as "all" | "today" | "week" | "month" | "year")}
                className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-900 text-xs font-bold py-2 pl-3 pr-8 rounded-xl shadow-2xs transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="month">This Month</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="year">Last Year</option>
                <option value="all">All Time</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="tx-status-filter" className="text-xs font-bold text-slate-500 flex items-center gap-1 whitespace-nowrap">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <span>Status:</span>
            </label>
            <div className="relative">
              <select
                id="tx-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-900 text-xs font-bold py-2 pl-3 pr-8 rounded-xl shadow-2xs transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="all">All Statuses</option>
                <option value="succeeded">Succeeded</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3.5 px-4">Date &amp; Time</th>
              <th className="py-3.5 px-4">Customer</th>
              <th className="py-3.5 px-4">Order #</th>
              <th className="py-3.5 px-4">Method</th>
              <th className="py-3.5 px-4">Amount</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Stripe Intent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTransactions.map((txn) => (
              <tr key={txn.id} className="hover:bg-pink-50/30 transition-colors">
                <td className="py-3.5 px-4 text-xs text-slate-600">
                  {new Date(txn.date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="py-3.5 px-4">
                  <p className="font-bold text-slate-900">{txn.customer_name}</p>
                  <p className="text-xs text-slate-500">{txn.customer_email}</p>
                </td>
                <td className="py-3.5 px-4">
                  <span className="font-mono text-xs font-bold text-slate-900">
                    {txn.order_number}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                    {txn.method} (•••• {txn.card_last4})
                  </span>
                </td>
                <td className="py-3.5 px-4 font-black text-slate-900">{formatCurrency(txn.amount)}</td>
                <td className="py-3.5 px-4">
                  <Badge variant={txn.status === "succeeded" ? "success" : txn.status === "pending" ? "warning" : "danger"}>
                    {txn.status}
                  </Badge>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{txn.stripe_payment_intent.slice(0, 14)}...</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile/Tablet Card View */}
      <div className="lg:hidden space-y-3">
        {filteredTransactions.map((txn) => (
          <div key={txn.id} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900 text-sm">{txn.customer_name}</p>
                <p className="text-xs text-slate-500">{new Date(txn.date).toLocaleDateString()}</p>
              </div>
              <Badge variant={txn.status === "succeeded" ? "success" : txn.status === "pending" ? "warning" : "danger"}>
                {txn.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-medium">Order: <strong className="text-slate-900">{txn.order_number}</strong></span>
              <span className="text-base font-black text-slate-900">{formatCurrency(txn.amount)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TransactionsManager;

"use client";

import * as React from "react";
import { CreditCard, Search, Filter, DollarSign, TrendingUp, AlertCircle, Calendar, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, getOrderPriceWithoutTip } from "@/lib/utils";
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
    return orders.map((o) => {
      const hasCard = Boolean(o.stripe_payment_method_id || o.card_last4);
      const initialPaid = (o.delivery_fee_paid ? Number(o.delivery_fee || 0) : 0) + (o.tip_paid ? Number(o.tip_amount || 0) : 0);
      const addrObj = (o.pickup_address && typeof o.pickup_address === "object") ? (o.pickup_address as Record<string, unknown>) : {};
      const errorReason = (addrObj.payment_error as string) || "";

      let statusReason = "Full balance paid & settled";
      if (o.payment_status === "failed") {
        statusReason = errorReason || "Card declined / Insufficient funds";
      } else if (o.payment_status === "refunded") {
        statusReason = "Refund processed via Stripe";
      } else if (o.payment_status === "paid") {
        statusReason = "Settled via Stripe off-session charge";
      } else if (o.payment_status === "authorized" || initialPaid > 0) {
        statusReason = `Card authorized · $${initialPaid.toFixed(2)} delivery & tip settled (Scale weigh pending)`;
      } else if (hasCard) {
        statusReason = "Card on file · Awaiting scale weigh-in";
      } else {
        statusReason = "Pending customer payment checkout";
      }

      return {
        id: `txn-${o.id}`, order_id: o.id, order_number: o.order_number,
        customer_name: o.customer_name || o.user?.full_name || "Customer",
        customer_email: o.customer_email || "customer@example.com",
        amount: o.total_amount,
        delivery_fee: Number(o.delivery_fee || 0),
        tip_amount: Number(o.tip_amount || 0),
        order_price: getOrderPriceWithoutTip(o),
        status_reason: statusReason,
        status: o.payment_status === "paid" ? "succeeded" : o.payment_status === "refunded" ? "refunded" : o.payment_status === "failed" ? "failed" : "pending",
        date: o.created_at || new Date().toISOString(),
        method: o.payment_method === "card" ? "Credit Card" : o.payment_method === "apple_pay" ? "Apple Pay" : o.payment_method === "google_pay" ? "Google Pay" : "Stripe Secured",
        card_last4: o.card_last4 || (o.payment_method === "card" ? "Card" : ""),
        stripe_payment_intent: o.stripe_payment_intent || "Stripe Secured",
      };
    });
  }, [orders]);

  const filteredTransactions = React.useMemo(() => {
    return transactions.filter((txn) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = txn.customer_name.toLowerCase().includes(q) || txn.customer_email.toLowerCase().includes(q) || txn.order_number.toLowerCase().includes(q) || txn.stripe_payment_intent.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || txn.status === statusFilter;
      let matchesDate = true;
      if (dateRange !== "all") {
        const txTime = new Date(txn.date).getTime();
        if (!isNaN(txTime)) {
          if (dateRange === "today") matchesDate = txTime >= new Date().setHours(0, 0, 0, 0);
          else if (dateRange === "week") matchesDate = txTime >= Date.now() - 7 * 86400000;
          else if (dateRange === "month") matchesDate = txTime >= Date.now() - 30 * 86400000;
          else if (dateRange === "year") matchesDate = txTime >= Date.now() - 365 * 86400000;
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
        {[
          { label: "Filtered Revenue", val: formatCurrency(totalRevenue), color: "text-slate-900", bg: "bg-emerald-50 text-emerald-600", Icon: TrendingUp },
          { label: "Total Refunds Issued", val: formatCurrency(totalRefunds), color: "text-rose-600", bg: "bg-rose-50 text-rose-600", Icon: DollarSign },
          { label: "Pending Stripe Holds", val: String(pendingCount), color: "text-amber-600", bg: "bg-amber-50 text-amber-600", Icon: AlertCircle },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</span>
              <p className={`text-2xl font-black ${kpi.color}`}>{kpi.val}</p>
            </div>
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${kpi.bg}`}><kpi.Icon className="h-6 w-6" /></div>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar with Dropdowns */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search customer, order #, or PI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5">
            <label htmlFor="tx-date-range" className="text-xs font-bold text-slate-500 flex items-center gap-1 whitespace-nowrap">
              <Calendar className="h-3.5 w-3.5 text-slate-400" /><span>Period:</span>
            </label>
            <div className="relative">
              <select
                id="tx-date-range" value={dateRange} onChange={(e) => setDateRange(e.target.value as "all" | "today" | "week" | "month" | "year")}
                className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-900 text-xs font-bold py-2 pl-3 pr-8 rounded-xl shadow-2xs transition-colors cursor-pointer focus:outline-none"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Past 7 Days</option>
                <option value="month">Past 30 Days</option>
                <option value="year">Past Year</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="tx-status-filter" className="text-xs font-bold text-slate-500 flex items-center gap-1 whitespace-nowrap">
              <Filter className="h-3.5 w-3.5 text-slate-400" /><span>Status:</span>
            </label>
            <div className="relative">
              <select
                id="tx-status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-900 text-xs font-bold py-2 pl-3 pr-8 rounded-xl shadow-2xs transition-colors cursor-pointer focus:outline-none"
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
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[880px] text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 whitespace-nowrap">Date &amp; Time</th>
                <th className="py-3.5 px-4 min-w-[160px]">Customer</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Order #</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Breakdown</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Total</th>
                <th className="py-3.5 px-4 min-w-[210px]">Status &amp; Reason</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Stripe Intent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-pink-50/30 transition-colors">
                  <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                    {new Date(txn.date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="py-3.5 px-4 min-w-[160px]">
                    <p className="font-bold text-slate-900">{txn.customer_name}</p>
                    <p className="text-xs text-slate-500">{txn.customer_email}</p>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="font-mono text-xs font-bold text-slate-900 block">{txn.order_number}</span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <CreditCard className="h-3 w-3 text-slate-400" />
                      {txn.method} {txn.card_last4 ? `(•••• ${txn.card_last4})` : ""}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                    <div className="space-y-0.5 text-[11px]">
                      <span className="text-slate-700 block">Wash: <strong>{formatCurrency(Math.max(0, (txn.order_price ?? txn.amount) - (txn.delivery_fee ?? 0)))}</strong></span>
                      <span className="text-slate-500 block">Delivery: {formatCurrency(txn.delivery_fee ?? 0)} · Tip: {formatCurrency(txn.tip_amount ?? 0)}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-black text-slate-900 whitespace-nowrap text-sm">{formatCurrency(txn.amount)}</td>
                  <td className="py-3.5 px-4 min-w-[210px]">
                    <Badge variant={txn.status === "succeeded" ? "success" : txn.status === "pending" ? "warning" : "danger"}>
                      {txn.status}
                    </Badge>
                    <span className="text-[10px] text-slate-600 block mt-1 leading-tight font-medium" title={txn.status_reason}>
                      {txn.status_reason}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{txn.stripe_payment_intent.slice(0, 14)}...</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile/Tablet Card View */}
      <div className="lg:hidden space-y-3">
        {filteredTransactions.map((txn) => (
          <div key={txn.id} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900 text-sm">{txn.customer_name}</p>
                <p className="text-xs text-slate-500">Order: <strong className="font-mono text-slate-900">{txn.order_number}</strong></p>
              </div>
              <Badge variant={txn.status === "succeeded" ? "success" : txn.status === "pending" ? "warning" : "danger"}>
                {txn.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-xs">
              <span className="text-slate-500">Delivery: {formatCurrency(txn.delivery_fee ?? 0)} · Tip: {formatCurrency(txn.tip_amount ?? 0)}</span>
              <span className="text-base font-black text-slate-900">{formatCurrency(txn.amount)}</span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium bg-slate-50 p-2 rounded-lg border border-slate-200/60">{txn.status_reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TransactionsManager;

"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { DashboardPageLayout } from "@/components/dashboard/dashboard-page-layout";
import { TransactionsManager } from "@/components/admin/transactions-manager";
import { CustomerPaymentCard } from "@/components/dashboard/customer-payment-card";
import { useOrdersRealtime } from "@/hooks/use-orders-realtime";
import type { Order } from "@/types";

export default function TransactionsUnifiedPage() {
  const { user, isAdmin } = useAuth();
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [slotTimes, setSlotTimes] = React.useState({ s1: "", e1: "", s2: "", e2: "" });

  const loadOrders = React.useCallback(async () => {
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data.orders)) setOrders(data.orders);
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetch("/api/content?type=settings")
      .then((r) => r.json())
      .then((d) => {
        if (d?.settings) {
          setSlotTimes({
            s1: d.settings.slot1_start || "",
            e1: d.settings.slot1_end || "",
            s2: d.settings.slot2_start || "",
            e2: d.settings.slot2_end || "",
          });
        }
      })
      .catch(() => {});
  }, []);

  useOrdersRealtime({
    onEvent: (event) => {
      const isRelevant =
        isAdmin ||
        (user && (event.userId === user.id || event.customerEmail === user.email)) ||
        orders.some((o) => o.id === event.orderId || o.order_number === event.orderNumber);
      if (isRelevant) void loadOrders();
    },
  });

  React.useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const filteredOrders = React.useMemo(() => {
    return orders.filter((order) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        order.order_number.toLowerCase().includes(q) ||
        (order.pricing_mode && order.pricing_mode.toLowerCase().includes(q)) ||
        (order.detergent_name && order.detergent_name.toLowerCase().includes(q)) ||
        (order.stripe_payment_intent && order.stripe_payment_intent.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "succeeded" && order.payment_status === "paid") ||
        (statusFilter === "pending" && order.payment_status !== "paid" && order.payment_status !== "refunded" && order.payment_status !== "failed") ||
        (statusFilter === "refunded" && order.payment_status === "refunded") ||
        (statusFilter === "failed" && order.payment_status === "failed");

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const totalPaid = React.useMemo(() => {
    return orders
      .filter((o) => o.payment_status === "paid")
      .reduce((acc, o) => acc + Number(o.total_amount || 0), 0);
  }, [orders]);

  return (
    <DashboardPageLayout
      activeSection="transactions"
      title={isAdmin ? "Transaction & Payment History" : "Payments & Billing Records"}
      subtitle={
        isAdmin
          ? "Stripe payment intents, receipts, and order billing logs"
          : "Verified payment logs, order breakdowns, and schedule timelines for all your services"
      }
    >
      {isAdmin ? (
        <TransactionsManager orders={orders} />
      ) : (
        <div className="space-y-6">
          {/* Lifetime Metrics Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-pink-100 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-slate-500 block">Total Lifetime Paid</span>
              <span className="text-2xl font-black text-slate-900">{formatCurrency(totalPaid)}</span>
              <span className="text-[11px] text-emerald-600 font-semibold block">
                {orders.filter((o) => o.payment_status === "paid").length} settled transactions
              </span>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-pink-100 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-slate-500 block">Payment Security</span>
              <span className="text-sm font-black text-slate-900 block">Stripe 256-Bit SSL Encrypted</span>
              <span className="text-[11px] text-slate-400 font-medium block">
                Direct TLS 1.3 gateway &bull; Zero sensitive card data stored
              </span>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search order #, plan, or reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <label htmlFor="txn-status-filter" className="text-xs font-bold text-slate-500">
                Status:
              </label>
              <select
                id="txn-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold py-1.5 px-3 rounded-xl cursor-pointer"
              >
                <option value="all">All Payments</option>
                <option value="succeeded">Succeeded (Paid)</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
          </div>

          {/* Detailed Payment Records List with Cool Expandable Drawer */}
          <div className="space-y-3.5">
            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 bg-white text-slate-400 text-xs italic">
                {isLoading ? "Loading payment records..." : "No payment records found."}
              </div>
            ) : (
              filteredOrders.map((order) => (
                <CustomerPaymentCard
                  key={order.id}
                  order={order}
                  slotTimes={slotTimes}
                />
              ))
            )}
          </div>
        </div>
      )}
    </DashboardPageLayout>
  );
}

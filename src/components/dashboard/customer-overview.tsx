"use client";

import * as React from "react";
import { ShoppingBag, CreditCard, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { PieChart, type PieSlice } from "@/components/shared/pie-chart";
import type { Order } from "@/types";

interface CustomerOverviewProps {
  orders?: Order[];
}

export function CustomerOverview({ orders: initialOrders }: CustomerOverviewProps) {
  const [orders, setOrders] = React.useState<Order[]>(initialOrders || []);

  React.useEffect(() => {
    if (initialOrders) {
      setOrders(initialOrders);
    } else {
      fetch("/api/orders")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.orders)) setOrders(data.orders);
        })
        .catch(() => {});
    }
  }, [initialOrders]);

  const totalSpent = React.useMemo(() => {
    return orders
      .filter((o) => o.order_status !== "cancelled")
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  }, [orders]);

  const totalTipsGiven = React.useMemo(() => {
    return orders
      .filter((o) => o.order_status !== "cancelled")
      .reduce((sum, o) => sum + Number(o.tip_amount || 0), 0);
  }, [orders]);

  const completedOrders = orders.filter((o) => o.order_status === "completed");
  const inProgressOrders = orders.filter(
    (o) => o.order_status !== "completed" && o.order_status !== "cancelled"
  );
  const cancelledOrders = orders.filter((o) => o.order_status === "cancelled");

  const orderSlices: PieSlice[] = React.useMemo(() => [
    { label: "Delivered & Complete", value: completedOrders.length, color: "#10b981" },
    { label: "Active In-Flight", value: inProgressOrders.length, color: "#ec4899" },
    { label: "Cancelled", value: cancelledOrders.length, color: "#94a3b8" },
  ], [completedOrders.length, inProgressOrders.length, cancelledOrders.length]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Total Spent (Transactions)</span>
            <CreditCard className="h-4 w-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-slate-900 block">{formatCurrency(totalSpent)}</span>
          <span className="text-[11px] text-emerald-600 font-semibold block">
            {totalTipsGiven > 0 ? `Includes ${formatCurrency(totalTipsGiven)} driver gratuity` : "All transactions settled"}
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Total Orders Placed</span>
            <ShoppingBag className="h-4 w-4 text-primary" />
          </div>
          <span className="text-2xl font-black text-slate-900 block">{orders.length} Order{orders.length !== 1 ? "s" : ""}</span>
          <span className="text-[11px] text-slate-500 font-medium block">
            {completedOrders.length} delivered • {inProgressOrders.length} active
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Active Wash Cycles</span>
            <Clock className="h-4 w-4 text-sky-600" />
          </div>
          <span className="text-2xl font-black text-primary block">{inProgressOrders.length}</span>
          <span className="text-[11px] text-sky-600 font-semibold block">24-hour turnaround guaranteed</span>
        </div>
      </div>

      {/* Orders Breakdown Chart & Short Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SVG Pie Chart of Orders */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-black text-slate-900">Orders Status Distribution</h3>
            <p className="text-xs text-slate-500">Visual overview of your laundry requests</p>
          </div>

          <PieChart
            slices={orderSlices}
            size={150}
            innerRadius={42}
            centerText={String(orders.length)}
            centerSubtext="Total"
          />
        </div>

        {/* Short Overview of Orders (Self-contained, no redirect links) */}
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">Recent Orders Overview</h3>
              <p className="text-xs text-slate-500">Quick snapshot of your most recent doorsteps</p>
            </div>
            <span className="text-xs font-bold text-slate-400">Showing last 5</span>
          </div>

          <div className="space-y-2.5">
            {orders.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                You haven&apos;t placed any laundry orders yet. Your order history and photo proofs will appear here.
              </div>
            ) : (
              orders.slice(0, 5).map((ord) => {
                const isComplete = ord.order_status === "completed";
                return (
                  <div
                    key={ord.id}
                    className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/80 flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">#{ord.order_number}</span>
                        <span className="text-slate-400">•</span>
                        <span className="font-semibold text-slate-700 truncate">{ord.pickup_date} ({ord.pickup_slot})</span>
                      </div>
                      <span className="text-[11px] text-slate-500 mt-0.5 block truncate">
                        {ord.pricing_mode === "per_bag" ? `${ord.bag_count || 1} Bag(s)` : ord.pricing_mode === "package" ? "Package Credits" : `${ord.final_weight_lbs || ord.estimated_weight_lbs || 15} lbs`} • Cold Water Clean • {ord.delivery_fee === 0 ? "Free Delivery" : `$${ord.delivery_fee} Delivery`}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-black text-slate-900 block">{formatCurrency(ord.total_amount)}</span>
                      <Badge variant={isComplete ? "success" : "warning"} className="text-[10px] uppercase font-bold">
                        {ord.order_status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

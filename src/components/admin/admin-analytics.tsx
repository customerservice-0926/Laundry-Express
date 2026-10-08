"use client";

import * as React from "react";
import { DollarSign, CheckCircle2, TrendingUp, Calendar, ChevronDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { PieChart, type PieSlice } from "@/components/shared/pie-chart";
import type { Order } from "@/types";

export type TimeFilterKey = "today" | "oneday" | "week" | "month" | "year" | "lifetime";

interface AdminAnalyticsProps {
  orders: Order[];
}

function parseDateSafe(val?: string | null): Date | null {
  if (!val) return null;
  const s = val.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

const FILTERS: { id: TimeFilterKey; label: string }[] = [
  { id: "today", label: "Today (Calendar Day)" },
  { id: "oneday", label: "Past 24 Hours" },
  { id: "week", label: "Last 7 Days (Week)" },
  { id: "month", label: "Last 30 Days (Month)" },
  { id: "year", label: "Last Year (365 Days)" },
  { id: "lifetime", label: "All Time (Lifetime)" },
];

export function AdminAnalytics({ orders }: AdminAnalyticsProps) {
  const [timeFilter, setTimeFilter] = React.useState<TimeFilterKey>("month");

  const filteredOrders = React.useMemo(() => {
    if (timeFilter === "lifetime") return orders;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = startOfToday + 86400000 - 1;
    const cutoffMap: Record<Exclude<TimeFilterKey, "lifetime" | "today">, number> = {
      oneday: 86400000,
      week: 7 * 86400000,
      month: 30 * 86400000,
      year: 365 * 86400000,
    };

    return orders.filter((o) => {
      const createdDate = parseDateSafe(o.created_at);
      const pickupDate = parseDateSafe(o.pickup_date);
      if (!createdDate && !pickupDate) return true;
      const createdTime = createdDate?.getTime() ?? 0;
      const pickupTime = pickupDate?.getTime() ?? 0;

      if (timeFilter === "today") {
        return (createdTime >= startOfToday && createdTime <= endOfToday) || (pickupTime >= startOfToday && pickupTime <= endOfToday);
      }
      const cutoffMs = cutoffMap[timeFilter];
      if (!cutoffMs) return true;
      const cutoffTime = now.getTime() - cutoffMs;
      return createdTime >= cutoffTime || pickupTime >= cutoffTime;
    });
  }, [orders, timeFilter]);

  const metrics = React.useMemo(() => {
    const isDone = (s: string) => s === "completed" || s === "delivered";
    const completedOrders = filteredOrders.filter((o) => isDone(o.order_status));
    const activeOrders = filteredOrders.filter((o) => !isDone(o.order_status) && o.order_status !== "cancelled");
    // Rule: Total revenue strictly calculated ONLY from complete orders
    const totalCompletedRevenue = completedOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const aov = completedOrders.length > 0 ? totalCompletedRevenue / completedOrders.length : 0;

    const getMode = (o: Order) => (o.pricing_mode || (o as { plan_type?: string }).plan_type || "").toLowerCase();
    const bagOrders = completedOrders.filter((o) => getMode(o).includes("bag"));
    const poundOrders = completedOrders.filter((o) => {
      const m = getMode(o);
      return m.includes("lb") || m.includes("pound") || m.includes("kg");
    });
    const pkgOrders = completedOrders.filter((o) => {
      const m = getMode(o);
      return m.includes("pack") || m.includes("bundle");
    });

    return {
      totalCompletedRevenue,
      completedCount: completedOrders.length,
      totalOrdersCount: filteredOrders.length,
      activeDispatches: activeOrders.length,
      aov,
      bagCount: bagOrders.length,
      bagRevenue: bagOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0),
      poundCount: poundOrders.length,
      poundRevenue: poundOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0),
      pkgCount: pkgOrders.length,
      pkgRevenue: pkgOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0),
    };
  }, [filteredOrders]);

  const salesPieSlices: PieSlice[] = React.useMemo(() => [
    { label: "By The Bag", value: metrics.bagCount, color: "#ec4899" },
    { label: "By The Pound", value: metrics.poundCount, color: "#0ea5e9" },
    { label: "Saver Bundles", value: metrics.pkgCount, color: "#a855f7" },
  ], [metrics]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="text-base font-black text-slate-900 tracking-tight">Real-Time Sales &amp; Orders Summary</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Total revenue counts exclusively verified completed orders with live distribution metrics.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label htmlFor="period-select" className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>Timeframe:</span>
          </label>
          <div className="relative">
            <select
              id="period-select"
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as TimeFilterKey)}
              className="appearance-none bg-slate-50 hover:bg-slate-100/80 border border-slate-300 text-slate-900 text-xs font-bold py-2 pl-3 pr-8 rounded-xl cursor-pointer"
            >
              {FILTERS.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 space-y-1">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[11px] font-black uppercase tracking-wider">Completed Revenue</span>
            <DollarSign className="h-4 w-4" />
          </div>
          <p className="text-2xl font-black text-emerald-950">{formatCurrency(metrics.totalCompletedRevenue)}</p>
          <span className="text-[11px] text-emerald-700 font-medium block">{metrics.completedCount} completed orders</span>
        </div>

        <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200/70 space-y-1">
          <div className="flex items-center justify-between text-sky-800">
            <span className="text-[11px] font-black uppercase tracking-wider">Completed Orders</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <p className="text-2xl font-black text-sky-950">{metrics.completedCount}</p>
          <span className="text-[11px] text-sky-700 font-medium block">
            {metrics.totalOrdersCount > 0 ? `${Math.round((metrics.completedCount / metrics.totalOrdersCount) * 100)}% fulfillment rate` : "No orders"}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/70 space-y-1">
          <div className="flex items-center justify-between text-purple-800">
            <span className="text-[11px] font-black uppercase tracking-wider">Average Completed Order</span>
            <TrendingUp className="h-4 w-4" />
          </div>
          <p className="text-2xl font-black text-purple-950">{formatCurrency(metrics.aov)}</p>
          <span className="text-[11px] text-purple-700 font-medium block">Per delivered wash</span>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/70 space-y-1">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-[11px] font-black uppercase tracking-wider">Active In-Flight</span>
            <Calendar className="h-4 w-4" />
          </div>
          <p className="text-2xl font-black text-amber-950">{metrics.activeDispatches}</p>
          <span className="text-[11px] text-amber-700 font-medium block">In process / out for delivery</span>
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-4">
        <div>
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Completed Orders Sales Breakdown (Pie Chart)</h4>
          <p className="text-[11px] text-slate-500">Distribution across service tiers for completed orders.</p>
        </div>
        <PieChart
          slices={salesPieSlices}
          size={160}
          innerRadius={45}
          centerText={String(metrics.completedCount)}
          centerSubtext="Completed"
        />
      </div>
    </div>
  );
}

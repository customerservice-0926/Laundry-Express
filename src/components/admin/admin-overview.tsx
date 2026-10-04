"use client";

import * as React from "react";
import { Users, Package, ShoppingBag, ShieldCheck } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { AdminAnalytics } from "./admin-analytics";
import type { Order } from "@/types";
import type { CustomerAccount } from "./customer-detail-modal";

interface AdminOverviewProps {
  orders: Order[];
  customers: CustomerAccount[];
}

export function AdminOverview({ orders, customers }: AdminOverviewProps) {
  const newOrders = React.useMemo(() => {
    return orders
      .filter((o) => o.order_status !== "cancelled")
      .slice(0, 6);
  }, [orders]);

  const newOrdersCount = orders.filter((o) => o.order_status === "confirmed" || o.order_status === "pending").length;
  const inWashCount = orders.filter((o) => o.order_status === "in_wash" || o.order_status === "picked_up").length;
  const outForDeliveryCount = orders.filter((o) => o.order_status === "out_for_delivery").length;

  return (
    <div className="space-y-6">
      {/* Real-time Sales Summary with Number, Completed Revenue, and SVG Pie Chart */}
      <AdminAnalytics orders={orders} />

      {/* New Orders & Operational Pipeline Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">New &amp; Recent Orders</h3>
              <p className="text-xs text-slate-500">Live feed of incoming customer wash requests</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-pink-50 text-primary border border-pink-100">
              {newOrdersCount} New Pickup Pending
            </span>
          </div>

          <div className="space-y-2.5">
            {newOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                No orders logged yet. New orders will appear here in real time.
              </div>
            ) : (
              newOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/80 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">#{ord.order_number}</span>
                      <span className="text-slate-400">•</span>
                      <span className="font-semibold text-slate-800 truncate">{ord.customer_name || ord.user?.full_name || "Customer"}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 mt-0.5 block truncate">
                      {ord.pickup_date} ({ord.pickup_slot}) • {ord.pricing_mode === "per_bag" ? `${ord.bag_count} Bag(s)` : `${ord.estimated_weight_lbs ?? 0} lbs`}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-black text-slate-900 block">{formatCurrency(ord.total_amount)}</span>
                    <span className="mt-1 inline-block text-[10px] uppercase font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                      {ord.order_status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* System & Operations Snapshot (No redirect links) */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-black text-slate-900">Operations Data Snapshot</h3>
            <p className="text-xs text-slate-500">Live system status and directory metrics</p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 text-xs">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-700"><Users className="h-4 w-4" /></div>
                <div>
                  <span className="font-bold text-slate-900 block">Registered Customers</span>
                  <span className="text-[11px] text-slate-500">Total client accounts</span>
                </div>
              </div>
              <span className="text-sm font-black text-slate-900">{customers.length}</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700"><ShoppingBag className="h-4 w-4" /></div>
                <div>
                  <span className="font-bold text-slate-900 block">Wash Cycles Active</span>
                  <span className="text-[11px] text-slate-500">Machines currently spinning</span>
                </div>
              </div>
              <span className="text-sm font-black text-slate-900">{inWashCount}</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-100 text-purple-700"><Package className="h-4 w-4" /></div>
                <div>
                  <span className="font-bold text-slate-900 block">Out for Delivery</span>
                  <span className="text-[11px] text-slate-500">Drivers on delivery routes</span>
                </div>
              </div>
              <span className="text-sm font-black text-slate-900">{outForDeliveryCount}</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700"><ShieldCheck className="h-4 w-4" /></div>
                <div>
                  <span className="font-bold text-slate-900 block">Cold-Water Wash Policy</span>
                  <span className="text-[11px] text-slate-500">Active eco-fabric safety</span>
                </div>
              </div>
              <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">Enforced</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

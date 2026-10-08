"use client";

import * as React from "react";
import { Bell, Filter, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Order, OrderStatus } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { OrderTableRow } from "./order-table-row";
import { OrderCard } from "./order-card";
import { OrderDetailModal } from "./order-detail-modal";
import { OrderProofModal } from "./order-proof-modal";
import { OrderWeighModal } from "./order-weigh-modal";

interface OrderPipelineProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, newStatus: OrderStatus, reason?: string, notes?: string) => Promise<boolean>;
  onUploadProof: (orderId: string, proofType: "pickup" | "dropoff" | "damage", imageUrl: string, notes?: string) => Promise<boolean>;
  onOpenManualOrder?: () => void;
}

export function OrderPipeline({
  orders,
  onUpdateStatus,
  onUploadProof,
  onOpenManualOrder,
}: OrderPipelineProps) {
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  const [detailOrderId, setDetailOrderId] = React.useState<string | null>(null);
  const [weighOrder, setWeighOrder] = React.useState<Order | null>(null);
  const [proofType, setProofType] = React.useState<"pickup" | "dropoff" | "damage">("pickup");
  const [proofModalOpen, setProofModalOpen] = React.useState<boolean>(false);
  const [systemAlert, setSystemAlert] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  const detailOrder = React.useMemo(() => orders.find((o) => o.id === detailOrderId) || null, [orders, detailOrderId]);

  const filteredOrders = React.useMemo(() => {
    if (statusFilter === "all") return orders;
    return orders.filter((o) => o.order_status === statusFilter);
  }, [orders, statusFilter]);

  const triggerAlert = (msg: string) => {
    setSystemAlert(msg);
    setTimeout(() => setSystemAlert(null), 4000);
  };

  const handleStatusChangeWithNotification = async (orderId: string, newStatus: OrderStatus, reason?: string, notes?: string) => {
    if (!await onUpdateStatus(orderId, newStatus, reason, notes)) return false;
    const ord = orders.find((o) => o.id === orderId);
    if (newStatus === "driver_assigned") {
      triggerAlert(`Order ${ord?.order_number || ""} accepted and ready for dispatch.`);
    } else if (newStatus === "out_for_delivery") {
      triggerAlert(`Order ${ord?.order_number || ""} marked Out for Delivery.`);
    } else if (newStatus === "cancelled") {
      triggerAlert(`Order ${ord?.order_number || ""} cancelled. Customer & Admin notified.`);
    }
    return true;
  };

  const handleOpenProofModal = (order: Order, type: "pickup" | "dropoff" | "damage") => {
    setSelectedOrder(order);
    setProofType(type);
    setProofModalOpen(true);
  };

  const handleSkipProof = async (orderId: string, type: "pickup" | "dropoff" | "damage") => {
    const ord = orders.find((o) => o.id === orderId);
    if (type === "pickup") {
      if (!await onUpdateStatus(orderId, "in_wash")) return;
      triggerAlert(`${ord?.order_number || ""} picked up (no photo). Moved to Wash & Dry.`);
    } else if (type === "dropoff") {
      if (!await onUpdateStatus(orderId, "completed")) return;
      triggerAlert(`${ord?.order_number || ""} marked delivered (no photo). Completed.`);
    } else {
      triggerAlert(`Flaw log skipped for ${ord?.order_number || ""}.`);
    }
  };

  const handleSaveProof = async (orderId: string, type: "pickup" | "dropoff" | "damage", imageUrl: string, notes?: string) => {
    if (!await onUploadProof(orderId, type, imageUrl, notes)) return;
    const ord = orders.find((o) => o.id === orderId);
    if (type === "pickup") {
      if (!await onUpdateStatus(orderId, "in_wash")) return;
      triggerAlert(`Pickup photo saved for ${ord?.order_number || ""}! In Wash & Dry.`);
    } else if (type === "dropoff") {
      if (!await onUpdateStatus(orderId, "completed")) return;
      triggerAlert(`Delivery photo verified for ${ord?.order_number || ""}! Completed.`);
    } else if (type === "damage") {
      triggerAlert(`Pre-existing garment flaw logged for ${ord?.order_number || ""}! Customer alerted.`);
    }
  };

  const totalRevenue = orders.reduce((acc, o) => acc + o.total_amount, 0);
  const activeCount = orders.filter((o) => o.order_status !== "completed" && o.order_status !== "cancelled").length;
  const inWashCount = orders.filter((o) => o.order_status === "in_wash" || o.order_status === "picked_up").length;
  const completedCount = orders.filter((o) => o.order_status === "completed").length;

  return (
    <div className="space-y-6">
      {systemAlert && (
        <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-700 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <Bell className="h-4 w-4 text-hero-amber shrink-0 animate-bounce" />
            <span>{systemAlert}</span>
          </div>
          <button type="button" onClick={() => setSystemAlert(null)} className="text-xs text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Today's Pipeline</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{formatCurrency(totalRevenue)}</span>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">{orders.length} Orders Logged</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Active In-Flight</span>
          <span className="text-2xl font-black text-primary mt-1 block">{activeCount}</span>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">Scheduled &amp; In-Route</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">In Wash &amp; Dry</span>
          <span className="text-2xl font-black text-hero-amber mt-1 block">{inWashCount}</span>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">Active Machine Cycles</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Completed</span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">{completedCount}</span>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">Photo Proofed &amp; Delivered</span>
        </div>
      </div>

      {/* Filter by Status Dropdown Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs text-xs">
        <div className="font-bold text-slate-700">
          Showing <span className="text-primary font-black">{filteredOrders.length}</span> of {orders.length} orders
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {onOpenManualOrder && (
            <Button
              size="sm"
              onClick={onOpenManualOrder}
              className="bg-primary hover:bg-primary-dark text-white text-xs h-7.5 px-3 font-bold rounded-xl shadow-xs"
            >
              <PhoneCall className="h-3.5 w-3.5 mr-1" />
              <span>+ Phone Order</span>
            </Button>
          )}
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <label htmlFor="admin-order-status-filter" className="font-bold text-slate-500">Status:</label>
            <select
              id="admin-order-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="font-bold px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 cursor-pointer text-xs"
            >
              <option value="all">All ({orders.length})</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="driver_assigned">Driver Assigned</option>
              <option value="picked_up">Picked Up</option>
              <option value="in_wash">In Wash</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Desktop Orders Table */}
      <div className="hidden lg:block rounded-3xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
            <tr>
              <th className="p-3.5">Order</th>
              <th className="p-3.5">Customer &amp; Notes</th>
              <th className="p-3.5">Mode &amp; Volume</th>
              <th className="p-3.5">Scheduled Slot</th>
              <th className="p-3.5">Total</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-right">Progressive Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredOrders.map((ord) => (
              <OrderTableRow
                key={ord.id}
                order={ord}
                onUpdateStatus={handleStatusChangeWithNotification}
                onOpenProofModal={handleOpenProofModal}
                onViewDetails={(o) => setDetailOrderId(o.id)}
                onWeighOrder={(o) => setWeighOrder(o)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {filteredOrders.map((ord) => (
          <OrderCard
            key={ord.id}
            order={ord}
            onUpdateStatus={handleStatusChangeWithNotification}
            onOpenProofModal={handleOpenProofModal}
            onViewDetails={(o) => setDetailOrderId(o.id)}
            onWeighOrder={(o) => setWeighOrder(o)}
          />
        ))}
      </div>

      <OrderProofModal
        order={selectedOrder}
        proofType={proofType}
        isOpen={proofModalOpen}
        onClose={() => setProofModalOpen(false)}
        onSaveProof={handleSaveProof}
        onSkip={handleSkipProof}
      />

      <OrderWeighModal
        order={weighOrder}
        isOpen={!!weighOrder}
        onClose={() => setWeighOrder(null)}
        onSuccess={(updated) => {
          triggerAlert(`Scale weight recorded for ${updated.order_number}! Customer charged.`);
        }}
      />

      <OrderDetailModal order={detailOrder} isOpen={!!detailOrder} onClose={() => setDetailOrderId(null)} onUpdateStatus={handleStatusChangeWithNotification} onOpenProofModal={handleOpenProofModal} onWeighOrder={(o) => setWeighOrder(o)} allOrders={orders} />
    </div>
  );
}

export default OrderPipeline;

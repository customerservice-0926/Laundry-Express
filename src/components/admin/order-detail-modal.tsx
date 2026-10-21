"use client";

import * as React from "react";
import { User, Phone, Mail, MapPin, Calendar, ShieldCheck } from "lucide-react";
import type { Order, OrderStatus } from "@/types";
import { ORDER_STATUSES } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";
import { OrderBillingCard } from "./order-billing-card";
import { OrderActionsBar } from "./order-actions-bar";
import { OrderProofsGallery } from "./order-proofs-gallery";

interface OrderDetailModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus?: (orderId: string, newStatus: OrderStatus, reason?: string, notes?: string) => Promise<boolean>;
  onOpenProofModal?: (order: Order, type: "pickup" | "dropoff" | "damage") => void;
  onWeighOrder?: (order: Order) => void;
  onOrderUpdated?: (order: Order) => void;
  onOrderDeleted?: (orderId: string) => void;
  allOrders?: Order[];
}

export function OrderDetailModal({
  order, isOpen, onClose, onUpdateStatus, onOpenProofModal, onWeighOrder, onOrderUpdated, onOrderDeleted, allOrders = [],
}: OrderDetailModalProps) {
  if (!order) return null;

  const statusMeta = ORDER_STATUSES[order.order_status] || ORDER_STATUSES.pending;
  const userPastOrders = allOrders.filter((o) => (order.customer_email && o.customer_email === order.customer_email) || (order.user_id && o.user_id === order.user_id));
  const prevOrdersCount = userPastOrders.filter((o) => o.id !== order.id).length;
  const lifetimeSpent = userPastOrders.reduce((sum, o) => sum + o.total_amount, 0) || order.total_amount;
  const fullOrderAddress = [order.street_address, order.apt_unit ? `Apt ${order.apt_unit}` : "", order.city, order.state, order.zip_code].filter(Boolean).join(", ") || order.pickup_address || "Address pending";

  return (
    <Dialog
      open={isOpen}
      onOpenChange={onClose}
      title={`Order Inspection: ${order.order_number}`}
      description={`Created on ${formatDate(order.created_at)} • Live operations audit`}
      className="max-w-3xl"
    >
      <div className="space-y-5 text-xs text-slate-700 pb-12">
        {/* Top Status & Overview Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500 uppercase text-[10px]">Status:</span>
            <span className={`px-3 py-1 rounded-full text-xs font-black border ${statusMeta.color}`}>
              {statusMeta.label}
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-600 font-medium text-xs">
            <Calendar className="h-4 w-4 text-sky-600 shrink-0" />
            <span>Pickup: <strong>{order.pickup_date}</strong> ({order.pickup_slot})</span>
          </div>
        </div>

        {/* 2-Column Primary Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {/* Card 1: Customer Contact & Delivery Presence */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 min-w-0">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 gap-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 shrink-0">
                <User className="h-4 w-4 text-sky-600 shrink-0" />
                <span>Customer &amp; Presence</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-pink-50 border border-pink-200 text-primary shrink-0">
                {prevOrdersCount > 0 ? "Repeat Customer" : "New Customer"}
              </span>
            </div>

            <div className="space-y-1.5 leading-relaxed min-w-0">
              <p className="font-extrabold text-sm text-slate-900 truncate">{order.customer_name || order.user?.full_name || "Customer"}</p>
              <div className="flex items-center gap-2 min-w-0">
                <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <a href={`mailto:${order.customer_email || order.user?.email}`} className="text-sky-600 hover:underline truncate">{order.customer_email || order.user?.email || "No email"}</a>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <a href={`tel:${order.customer_phone || order.user?.phone || ""}`} className="text-slate-800 font-semibold hover:text-sky-600 truncate">{order.customer_phone || order.user?.phone || "No phone"}</a>
              </div>
              <div className="flex items-start gap-2 pt-1 min-w-0">
                <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                <span className="font-medium text-slate-900 break-words leading-tight">{fullOrderAddress}</span>
              </div>
            </div>

            {/* User History Preview */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px]">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Previous Orders</span>
                <span className="font-extrabold text-slate-900">{prevOrdersCount} previous order{prevOrdersCount !== 1 ? "s" : ""}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Lifetime Value</span>
                <span className="font-extrabold text-emerald-600">{formatCurrency(lifetimeSpent)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <span className="font-bold text-slate-700 block text-[11px]">Pickup Protocol:</span>
              <div className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${order.is_out_of_home ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-emerald-50 border-emerald-200 text-emerald-900"}`}>
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>{order.is_out_of_home ? "Away — Contactless Doorstep Pickup" : "Home — Driver Rings Doorbell"}</span>
              </div>
              {order.customer_notes && (
                <p className="text-[11px] text-slate-600 italic bg-slate-50 p-2 rounded-xl border border-slate-200 break-words">
                  &ldquo;{order.customer_notes}&rdquo;
                </p>
              )}
            </div>
          </div>

          {/* Card 2: Laundry Wash Configuration & Organized Billing */}
          <OrderBillingCard order={order} />
        </div>

        {/* Card 3: Photo Proofs Gallery & Damage Audit */}
        <OrderProofsGallery order={order} onOrderUpdated={onOrderUpdated} />

        {/* Modal Action Footer */}
        <OrderActionsBar
          order={order}
          onClose={onClose}
          onUpdateStatus={onUpdateStatus}
          onOpenProofModal={onOpenProofModal}
          onWeighOrder={onWeighOrder}
          onOrderUpdated={onOrderUpdated}
          onOrderDeleted={onOrderDeleted}
        />
      </div>
    </Dialog>
  );
}

export default OrderDetailModal;

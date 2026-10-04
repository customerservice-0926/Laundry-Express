"use client";

import { Clock, Camera, AlertTriangle, Check, Send, ChevronRight } from "lucide-react";
import type { Order, OrderStatus } from "@/types";
import { ORDER_STATUSES } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface OrderCardProps {
  order: Order;
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => void;
  onOpenProofModal: (order: Order, type: "pickup" | "dropoff" | "damage") => void;
  onViewDetails?: (order: Order) => void;
}

/**
 * OrderCard Component
 *
 * Dedicated mobile & tablet card representation for orders.
 * Eliminates horizontal table scrolling on touch devices.
 */
export function OrderCard({
  order,
  onUpdateStatus,
  onOpenProofModal,
  onViewDetails,
}: OrderCardProps) {
  const statusMeta = ORDER_STATUSES[order.order_status] || ORDER_STATUSES.pending;

  return (
    <div
      onClick={() => onViewDetails?.(order)}
      className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-primary/50 transition-all cursor-pointer space-y-3 group"
    >
      {/* Top Header: Order Number, Date, Status */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-slate-900 text-sm group-hover:text-primary transition-colors underline underline-offset-2 decoration-slate-300">
              {order.order_number}
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {formatDate(order.created_at)}
          </span>
        </div>

        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${statusMeta.color}`}
        >
          {statusMeta.label}
        </span>
      </div>

      {/* Customer Info & Badges */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-900">{order.customer_name || order.user?.full_name || "Customer"}</span>
          <span className="font-black text-slate-900 text-sm">{formatCurrency(order.total_amount)}</span>
        </div>
        <p className="text-[11px] text-slate-500 line-clamp-1">
          {[order.street_address, order.apt_unit ? `Apt ${order.apt_unit}` : "", order.city, order.state, order.zip_code].filter(Boolean).join(", ") || order.pickup_address || "Doorstep Address"}
        </p>

        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {order.is_out_of_home && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
              Away • Bag Outside Door
            </span>
          )}

          {order.has_preexisting_damage && (
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 shrink-0 text-rose-600" />
              Damage Logged
            </span>
          )}
        </div>
      </div>

      {/* Mode & Pickup Slot Details */}
      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 text-xs">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Mode & Volume</span>
          <span className="font-semibold text-slate-800 text-[11px]">
            {order.pricing_mode === "per_bag"
              ? `${order.bag_count} Bag(s)`
              : order.final_weight_lbs
              ? `${order.final_weight_lbs} lbs (Final)`
              : `${order.estimated_weight_lbs || 15} lbs (Est.)`}
          </span>
        </div>

        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Pickup Slot</span>
          <span className="font-medium text-slate-700 text-[11px] flex items-center gap-1">
            <Clock className="h-3 w-3 text-sky-600 shrink-0" />
            {order.pickup_slot}
          </span>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div
        className="flex flex-wrap items-center justify-end gap-1.5 pt-1"
        onClick={(e) => e.stopPropagation()}
      >
        {order.order_status === "confirmed" && (
          <Button
            variant="hero"
            size="sm"
            className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700"
            onClick={() => onUpdateStatus(order.id, "driver_assigned")}
          >
            <Send className="h-3.5 w-3.5 mr-1 shrink-0" />
            Accept Order
          </Button>
        )}

        {order.order_status === "driver_assigned" && (
          <Button
            variant="primary"
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={() => onOpenProofModal(order, "pickup")}
          >
            <Camera className="h-3.5 w-3.5 mr-1 shrink-0" />
            Pickup Proof
          </Button>
        )}

        {order.order_status === "in_wash" && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 text-xs border-rose-300 text-rose-700 hover:bg-rose-50"
              onClick={() => onOpenProofModal(order, "damage")}
            >
              <AlertTriangle className="h-3.5 w-3.5 mr-1 text-rose-600 shrink-0" />
              Damage
            </Button>
            <Button
              variant="hero"
              size="sm"
              className="h-8 px-2.5 text-xs"
              onClick={() => onUpdateStatus(order.id, "out_for_delivery")}
            >
              Ready Delivery
            </Button>
          </>
        )}

        {order.order_status === "out_for_delivery" && (
          <Button
            variant="hero"
            size="sm"
            className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700"
            onClick={() => onOpenProofModal(order, "dropoff")}
          >
            <Camera className="h-3.5 w-3.5 mr-1 shrink-0" />
            Deliver (Photo)
          </Button>
        )}

        {order.order_status === "completed" && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Check className="h-3 w-3 text-emerald-600 shrink-0" />
            Completed
          </span>
        )}
      </div>
    </div>
  );
}

export default OrderCard;

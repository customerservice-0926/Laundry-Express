"use client";

import { Clock, Camera, AlertTriangle, Check, Send } from "lucide-react";
import type { Order, OrderStatus } from "@/types";
import { ORDER_STATUSES } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface OrderTableRowProps {
  order: Order;
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => void;
  onOpenProofModal: (order: Order, type: "pickup" | "dropoff" | "damage") => void;
  onViewDetails?: (order: Order) => void;
}

export function OrderTableRow({
  order,
  onUpdateStatus,
  onOpenProofModal,
  onViewDetails,
}: OrderTableRowProps) {
  const statusMeta = ORDER_STATUSES[order.order_status] || ORDER_STATUSES.pending;

  return (
    <tr
      onClick={() => onViewDetails?.(order)}
      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
      title="Click row to inspect complete order details"
    >
      <td className="p-3.5">
        <div className="text-left font-extrabold text-slate-900 group-hover:text-primary transition-colors flex flex-col">
          <span className="underline underline-offset-2 decoration-slate-300 group-hover:decoration-primary">
            {order.order_number}
          </span>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5 font-normal">
            {formatDate(order.created_at)}
          </span>
        </div>
      </td>

      <td className="p-3.5">
        <span className="font-semibold text-slate-800 block">
          {order.customer_name || order.user?.full_name || "Customer"}
        </span>
        <span className="text-[11px] text-slate-500 block max-w-xs truncate" title={[order.street_address, order.apt_unit ? `Apt ${order.apt_unit}` : "", order.city, order.state, order.zip_code].filter(Boolean).join(", ") || order.pickup_address || "Doorstep Address"}>
          {[order.street_address, order.apt_unit ? `Apt ${order.apt_unit}` : "", order.city, order.state, order.zip_code].filter(Boolean).join(", ") || order.pickup_address || "Doorstep Address"}
        </span>

        {/* Status Callout Badges */}
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          {order.is_out_of_home && (
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
              Away • Bag Outside Door
            </span>
          )}

          {order.has_preexisting_damage && (
            <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 shrink-0 text-rose-600" />
              Damage Logged • Customer Notified
            </span>
          )}
        </div>
      </td>

      <td className="p-3.5">
        <span className="font-bold text-sky-800 uppercase text-[10px] block">
          {order.pricing_mode === "per_bag"
            ? "By Bag"
            : order.pricing_mode === "per_lb"
            ? "By Weight (lbs)"
            : "Package"}
        </span>
        <span className="text-slate-600 font-semibold">
          {order.pricing_mode === "per_bag"
            ? `${order.bag_count} Bag(s)`
            : order.final_weight_lbs
            ? `${order.final_weight_lbs} lbs (Final)`
            : `${order.estimated_weight_lbs || 15} lbs (Est.)`}
        </span>
      </td>

      <td className="p-3.5">
        <span className="font-medium text-slate-900 block">{order.pickup_date}</span>
        <span className="text-slate-500 text-[11px] flex items-center gap-1">
          <Clock className="h-3 w-3 text-sky-600 shrink-0" />
          {order.pickup_slot}
        </span>
      </td>

      <td className="p-3.5 font-bold text-slate-900">
        {formatCurrency(order.total_amount)}
      </td>

      <td className="p-3.5">
        <span
          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusMeta.color}`}
        >
          {statusMeta.label}
        </span>
      </td>

      <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
        {/* Step-by-Step Progressive Action Buttons */}
        {order.order_status === "confirmed" && (
          <Button
            variant="hero"
            size="sm"
            className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700"
            onClick={(e) => {
              e.stopPropagation();
              onUpdateStatus(order.id, "driver_assigned");
            }}
            title="Accept order and dispatch confirmation email to customer"
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
            onClick={(e) => {
              e.stopPropagation();
              onOpenProofModal(order, "pickup");
            }}
            title="Upload pickup proof photo to start wash cycle"
          >
            <Camera className="h-3.5 w-3.5 mr-1 shrink-0" />
            Pickup (Photo Proof)
          </Button>
        )}

        {order.order_status === "in_wash" && (
          <div className="inline-flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 text-xs border-rose-300 text-rose-700 hover:bg-rose-50"
              onClick={(e) => {
                e.stopPropagation();
                onOpenProofModal(order, "damage");
              }}
              title="Add photo of pre-existing garment tear or stain to notify customer"
            >
              <AlertTriangle className="h-3.5 w-3.5 mr-1 text-rose-600 shrink-0" />
              Report Damage
            </Button>

            <Button
              variant="hero"
              size="sm"
              className="h-8 px-2.5 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateStatus(order.id, "out_for_delivery");
              }}
              title="Mark order finished washing & ready for delivery"
            >
              Ready for Delivery
            </Button>
          </div>
        )}

        {order.order_status === "out_for_delivery" && (
          <Button
            variant="hero"
            size="sm"
            className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700"
            onClick={(e) => {
              e.stopPropagation();
              onOpenProofModal(order, "dropoff");
            }}
            title="Upload drop-off photo proof to complete order"
          >
            <Camera className="h-3.5 w-3.5 mr-1 shrink-0" />
            Deliver (Drop-off Photo)
          </Button>
        )}

        {order.order_status === "completed" && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Check className="h-3 w-3 text-emerald-600 shrink-0" />
            Completed
          </span>
        )}
      </td>
    </tr>
  );
}

export default OrderTableRow;

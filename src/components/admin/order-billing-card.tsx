"use client";

import * as React from "react";
import { Sparkles, CreditCard, HeartHandshake, Info } from "lucide-react";
import type { Order } from "@/types";
import { formatCurrency, getOrderPriceWithoutTip } from "@/lib/utils";

interface OrderBillingCardProps {
  order: Order;
}

export function OrderBillingCard({ order }: OrderBillingCardProps) {
  const detergentName = order.detergent_name || order.detergent_id || "Standard Hypoallergenic";
  const washAndItems = Math.max(
    0,
    Number(order.subtotal || 0) +
      Number(order.detergent_fee || 0) +
      Number(order.additional_items_fee || 0) -
      Number(order.discount_amount || 0)
  );
  const isUpfrontPaid = Boolean(
    order.delivery_fee_paid ||
      order.tip_paid ||
      order.payment_status === "paid" ||
      (order.payment_status === "authorized" && order.stripe_payment_intent)
  );

  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 min-w-0">
      <div className="flex items-center gap-2 font-bold text-slate-900 border-b border-slate-100 pb-2">
        <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
        <span className="truncate">Wash Specs &amp; Cost Breakdown</span>
      </div>

      {/* Service Configuration */}
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between items-center gap-2">
          <span className="text-slate-500 shrink-0">Service Plan:</span>
          <span className="font-extrabold text-slate-900 uppercase text-right truncate">
            {order.pricing_mode === "per_bag" ? "By Bag" : order.pricing_mode === "per_lb" ? "By Weight (lbs)" : "Package"}
          </span>
        </div>
        <div className="flex justify-between items-center gap-2">
          <span className="text-slate-500 shrink-0">Measured Volume:</span>
          <span className="font-extrabold text-slate-900 text-right truncate">
            {order.pricing_mode === "per_bag"
              ? `${order.bag_count} Bags`
              : order.final_weight_lbs
              ? `${order.final_weight_lbs} lbs (Scale Final)`
              : `${order.estimated_weight_lbs || 15} lbs (Est.)`}
          </span>
        </div>
        <div className="flex justify-between items-center gap-2">
          <span className="text-slate-500 shrink-0">Wash Detergent:</span>
          <span className="font-semibold text-slate-800 text-right truncate">
            {detergentName}{" "}
            <span className={Number(order.detergent_fee || 0) === 0 ? "text-emerald-700 font-bold" : "text-amber-700 font-bold"}>
              ({Number(order.detergent_fee || 0) === 0 ? "FREE" : `+$${Number(order.detergent_fee).toFixed(2)}`})
            </span>
          </span>
        </div>
      </div>

      {/* Specialty Items List - Clean list format, no breaking text */}
      {order.additional_items && order.additional_items.length > 0 && (
        <div className="pt-2 border-t border-slate-100 space-y-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <span className="font-bold text-slate-700">Specialty Items ({order.additional_items.length}):</span>
            <span className="font-bold text-slate-900">+{formatCurrency(order.additional_items_fee || 0)}</span>
          </div>
          <div className="space-y-1 bg-slate-50 p-2 rounded-xl border border-slate-200">
            {order.additional_items.map((it, idx) => (
              <div key={it.id || idx} className="flex justify-between items-center gap-2 text-[11px]">
                <span className="text-slate-800 font-medium truncate min-w-0">
                  {it.name} <span className="text-slate-400">({it.quantity}x @ {formatCurrency(it.price)})</span>
                </span>
                <span className="font-bold text-slate-900 shrink-0">+{formatCurrency(it.price * it.quantity)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Block 1: Upfront Booking Settle (Delivery & Driver Tip) */}
      <div className="p-3 rounded-xl bg-pink-50/50 border border-pink-200/80 space-y-2 text-[11px]">
        <div className="flex items-center justify-between font-bold text-slate-800 gap-2">
          <span className="flex items-center gap-1.5 text-primary shrink-0">
            <HeartHandshake className="h-4 w-4 shrink-0 text-pink-600" />
            <span className="font-black">Upfront Booking Settle</span>
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${isUpfrontPaid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
            {isUpfrontPaid ? "✓ Paid at Booking" : "Pending Booking Settle"}
          </span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-slate-600">
            <span>Doorstep Delivery:</span>
            <span className="font-semibold text-slate-800">
              {order.delivery_fee === 0 ? "FREE ($0.00)" : formatCurrency(order.delivery_fee)}
            </span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Driver &amp; Crew Tip (Gratuity):</span>
            <span className="font-bold text-emerald-700">+{formatCurrency(order.tip_amount || 0)}</span>
          </div>
        </div>
        <div className="p-2 rounded-lg bg-white/90 border border-pink-100/90 text-[10px] text-slate-600 space-y-0.5">
          <div className="flex items-center gap-1 text-slate-800 font-bold">
            <Info className="h-3 w-3 text-pink-600 shrink-0" />
            <span>100% Direct Driver Tip Policy</span>
          </div>
          <p className="leading-relaxed text-slate-500">
            Driver tips go 100% directly to the courier &amp; wash staff. Paid upfront at booking and kept separate from laundry service costs.
          </p>
        </div>
      </div>

      {/* Block 2: Laundry Service & Card on File Charge */}
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-[11px]">
        <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 flex items-center justify-between">
          <span>Laundry Service Charges</span>
          <span className="text-[10px] text-slate-500 font-normal">Card on file</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>Wash Subtotal:</span>
          <span className="font-semibold text-slate-900">{formatCurrency(order.subtotal)}</span>
        </div>
        {Number(order.detergent_fee || 0) > 0 && (
          <div className="flex justify-between text-slate-600">
            <span>Detergent Upgrade:</span>
            <span className="font-semibold text-slate-900">+{formatCurrency(Number(order.detergent_fee || 0))}</span>
          </div>
        )}
        {Number(order.additional_items_fee || 0) > 0 && (
          <div className="flex justify-between text-slate-600">
            <span>Specialty Add-ons:</span>
            <span className="font-semibold text-slate-900">+{formatCurrency(Number(order.additional_items_fee || 0))}</span>
          </div>
        )}
        {order.discount_amount > 0 && (
          <div className="flex justify-between text-emerald-600 font-bold">
            <span>Coupon Discount:</span>
            <span>-{formatCurrency(order.discount_amount)}</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 font-bold text-slate-900">
          <div>
            <span className="block text-xs font-black">Wash &amp; Items Balance:</span>
            <span className="text-[10px] text-slate-400 font-normal">Net charge (excl. upfront $20)</span>
          </div>
          <span className="text-primary font-black text-sm">{formatCurrency(washAndItems)}</span>
        </div>
      </div>

      {/* Totals Summary */}
      <div className="pt-2 border-t border-slate-100 space-y-1">
        <div className="flex justify-between text-slate-600 text-xs font-semibold">
          <span>Core Laundry Price (excl. tip):</span>
          <span className="text-slate-900">{formatCurrency(getOrderPriceWithoutTip(order))}</span>
        </div>
        <div className="flex justify-between text-slate-600 text-xs font-semibold">
          <span>Driver Tip (Separate Gratuity):</span>
          <span className="text-emerald-700">+{formatCurrency(order.tip_amount || 0)}</span>
        </div>
        <div className="flex justify-between items-center text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
          <span>Total Order Value:</span>
          <span className="text-base text-primary font-black">{formatCurrency(order.total_amount)}</span>
        </div>

        {/* Stripe Details */}
        <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500">
          <span className="font-semibold">Stripe Payment:</span>
          <span className="font-mono text-slate-800 text-[10px] bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[170px]" title={order.stripe_payment_intent || ""}>
            {order.stripe_payment_intent ? `${order.stripe_payment_intent.slice(0, 16)}...` : "Card on File"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold pt-0.5">
          <CreditCard className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {order.card_last4 ? `${(order.card_brand || "Card").toUpperCase()} •••• ${order.card_last4}` : "Verified Card on File"} · {order.payment_status === "paid" ? "Paid & Settled" : "Card Authorized"}
          </span>
        </div>
      </div>
    </div>
  );
}

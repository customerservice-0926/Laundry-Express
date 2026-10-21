"use client";

import * as React from "react";
import { Sparkles, CreditCard, HeartHandshake } from "lucide-react";
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
    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
      <div className="flex items-center gap-2 font-bold text-slate-900 border-b border-slate-100 pb-2">
        <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
        <span>Wash Specs &amp; Organized Billing</span>
      </div>

      {/* Service Configuration */}
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Service Plan:</span>
          <span className="font-extrabold text-slate-900 uppercase">
            {order.pricing_mode === "per_bag" ? "By Bag" : order.pricing_mode === "per_lb" ? "By Weight (lbs)" : "Package"}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Measured Volume:</span>
          <span className="font-extrabold text-slate-900">
            {order.pricing_mode === "per_bag"
              ? `${order.bag_count} Bags`
              : order.final_weight_lbs
              ? `${order.final_weight_lbs} lbs (Scale Final)`
              : `${order.estimated_weight_lbs || 15} lbs (Est.)`}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Wash Detergent:</span>
          <span className="font-semibold text-slate-800">
            {detergentName}{" "}
            <span className={Number(order.detergent_fee || 0) === 0 ? "text-emerald-700 font-bold" : "text-amber-700 font-bold"}>
              ({Number(order.detergent_fee || 0) === 0 ? "FREE" : `+$${Number(order.detergent_fee).toFixed(2)}`})
            </span>
          </span>
        </div>
      </div>

      {/* Specialty Items List - Clean, non-breaking */}
      {order.additional_items && order.additional_items.length > 0 && (
        <div className="pt-2 border-t border-slate-100 space-y-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <span className="font-bold text-slate-700">Specialty Items ({order.additional_items.length}):</span>
            <span className="font-bold text-slate-900">+{formatCurrency(order.additional_items_fee || 0)}</span>
          </div>
          <div className="space-y-1 bg-slate-50 p-2 rounded-xl border border-slate-200">
            {order.additional_items.map((it, idx) => (
              <div key={it.id || idx} className="flex justify-between items-center text-[11px]">
                <span className="text-slate-800 font-medium">
                  {it.name} <span className="text-slate-400">({it.quantity}x @ {formatCurrency(it.price)})</span>
                </span>
                <span className="font-bold text-slate-900">+{formatCurrency(it.price * it.quantity)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Block 1: Upfront Booking Settle (Delivery & Driver Tip) */}
      <div className="p-2.5 rounded-xl bg-pink-50/40 border border-pink-200/60 space-y-1.5 text-[11px]">
        <div className="flex items-center justify-between font-bold text-slate-800">
          <span className="flex items-center gap-1.5 text-primary">
            <HeartHandshake className="h-3.5 w-3.5 shrink-0" />
            <span>Upfront Doorstep Settle</span>
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-black">
            {isUpfrontPaid ? "✓ Paid at Booking" : "Pending Booking Settle"}
          </span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>Doorstep Delivery:</span>
          <span className="font-semibold text-slate-800">
            {order.delivery_fee === 0 ? "FREE ($0.00)" : formatCurrency(order.delivery_fee)}
          </span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>Driver &amp; Crew Tip:</span>
          <span className="font-bold text-emerald-700">+{formatCurrency(order.tip_amount || 0)}</span>
        </div>
        <p className="text-[10px] text-slate-500 italic pt-0.5 border-t border-pink-100">
          Tip goes 100% directly to delivery driver &amp; crew. Collected upfront, separate from laundry service costs.
        </p>
      </div>

      {/* Block 2: Laundry Service & Card on File Charge */}
      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-[11px]">
        <div className="flex justify-between text-slate-600">
          <span>Wash Subtotal:</span>
          <span className="font-semibold text-slate-900">{formatCurrency(order.subtotal)}</span>
        </div>
        {Number(order.detergent_fee || 0) > 0 && (
          <div className="flex justify-between text-slate-600">
            <span>Detergent Fee:</span>
            <span className="font-semibold text-slate-900">+{formatCurrency(Number(order.detergent_fee || 0))}</span>
          </div>
        )}
        {Number(order.additional_items_fee || 0) > 0 && (
          <div className="flex justify-between text-slate-600">
            <span>Specialty Items:</span>
            <span className="font-semibold text-slate-900">+{formatCurrency(Number(order.additional_items_fee || 0))}</span>
          </div>
        )}
        {order.discount_amount > 0 && (
          <div className="flex justify-between text-emerald-600 font-bold">
            <span>Coupon Discount:</span>
            <span>-{formatCurrency(order.discount_amount)}</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-1 border-t border-slate-200 font-bold text-slate-900">
          <span>Wash &amp; Items Balance:</span>
          <span className="text-primary font-black">{formatCurrency(washAndItems)}</span>
        </div>
      </div>

      {/* Totals Summary */}
      <div className="pt-2 border-t border-slate-100 space-y-1">
        <div className="flex justify-between text-slate-600 text-xs font-semibold">
          <span>Laundry Order Price (excl. tip):</span>
          <span className="text-slate-900">{formatCurrency(getOrderPriceWithoutTip(order))}</span>
        </div>
        <div className="flex justify-between text-slate-600 text-xs font-semibold">
          <span>Driver &amp; Crew Tip:</span>
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
          <span>
            {order.card_last4 ? `${(order.card_brand || "Card").toUpperCase()} •••• ${order.card_last4}` : "Verified Card on File"} · {order.payment_status === "paid" ? "Paid & Settled" : "Card Authorized"}
          </span>
        </div>
      </div>
    </div>
  );
}

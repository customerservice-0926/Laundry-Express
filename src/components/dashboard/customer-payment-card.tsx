"use client";

import * as React from "react";
import {
  CreditCard,
  Calendar,
  Clock,
  MapPin,
  Copy,
  Check,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatSlotLabel, resolveDetergentName } from "@/lib/utils";
import type { Order } from "@/types";

interface CustomerPaymentCardProps {
  order: Order;
  slotTimes?: { s1?: string; e1?: string; s2?: string; e2?: string };
}

export function CustomerPaymentCard({ order, slotTimes }: CustomerPaymentCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [copiedTxn, setCopiedTxn] = React.useState(false);

  const slotLabel =
    slotTimes?.s1 &&
    slotTimes?.e1 &&
    slotTimes?.s2 &&
    slotTimes?.e2 &&
    (order.pickup_slot === "8am-12pm" || order.pickup_slot === "1pm-6pm")
      ? formatSlotLabel(
          order.pickup_slot as "8am-12pm" | "1pm-6pm",
          slotTimes.s1,
          slotTimes.e1,
          slotTimes.s2,
          slotTimes.e2
        )
      : order.pickup_slot || "Scheduled Window";

  const planLabel =
    order.pricing_mode === "per_bag"
      ? "By The Bag (13 Gal)"
      : order.pricing_mode === "package"
        ? "Saver Package Credit"
        : "By The Pound (lb)";

  const quantityLabel =
    order.pricing_mode === "per_bag"
      ? `${order.bag_count || 1} Bag(s)`
      : `${order.final_weight_lbs || order.estimated_weight_lbs || 15} lbs`;

  const detergentName = order.detergent_name || resolveDetergentName(order.detergent_id);
  const detFee = Number(order.detergent_fee || 0);
  const deliveryFee = Number(order.delivery_fee || 0);
  const discountAmount = Number(order.discount_amount || 0);
  const subtotal = Number(order.subtotal || order.total_amount || 0);
  const txId =
    order.stripe_payment_intent ||
    `STRIPE-TX-${order.order_number.replace(/[^A-Za-z0-9]/g, "").slice(-8).toUpperCase()}`;

  const fullAddress =
    [
      order.street_address,
      order.apt_unit ? `Apt ${order.apt_unit}` : "",
      order.city,
      order.state,
      order.zip_code,
    ]
      .filter(Boolean)
      .join(", ") ||
    order.pickup_address ||
    "Doorstep Address";

  const orderDateStr = order.created_at
    ? new Date(order.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Today";

  const isPaid = order.payment_status === "paid";
  const isRefunded = order.payment_status === "refunded";

  const handleCopyTx = (e: React.MouseEvent) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(txId);
    setCopiedTxn(true);
    setTimeout(() => setCopiedTxn(false), 2500);
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs hover:border-pink-300/80 transition-colors">
      {/* Primary Summary Header — Clickable to Toggle Drawer */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 bg-linear-to-b from-slate-50/70 to-white cursor-pointer select-none"
      >
        <div className="flex items-start gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-pink-100/80 text-primary flex items-center justify-center shrink-0 mt-0.5 border border-pink-200/60 shadow-2xs">
            <CreditCard className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-black text-slate-900 text-sm sm:text-base">
                #{order.order_number}
              </span>
              <Badge
                variant={isPaid ? "success" : isRefunded ? "danger" : "warning"}
                className="text-[10px] uppercase font-bold"
              >
                {isPaid ? "Paid & Settled" : isRefunded ? "Refunded" : "Pending Settlement"}
              </Badge>
              <Badge variant="outline" className="text-[10px] font-semibold text-slate-600 bg-white">
                {planLabel} &bull; {quantityLabel}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 font-medium">
              <span>{orderDateStr}</span>
              <span>&bull;</span>
              <span>{order.payment_method === "card" ? "Credit / Debit Card (Stripe)" : "Stripe Secured"}</span>
              <span>&bull;</span>
              <span className="text-emerald-700 font-semibold">{detergentName}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <div className="text-left sm:text-right">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Total Amount
            </span>
            <span className="text-lg sm:text-xl font-black text-primary tracking-tight">
              {formatCurrency(order.total_amount)}
            </span>
          </div>

          <div className="h-8 w-8 rounded-lg bg-slate-100/80 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </div>

      {/* Expanded Drawer: Order & Payment Breakdown */}
      {isExpanded && (
        <div className="p-4 sm:p-5 bg-slate-50/60 space-y-4 border-t border-slate-100 text-xs">
          {/* 2-Column Schedule & Financial Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 space-y-1.5">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">
                Schedule &amp; Delivery Timeline
              </span>
              <div className="space-y-1 text-slate-700 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>Pickup: <strong>{order.pickup_date}</strong> ({slotLabel})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Estimated Return: <strong className="text-emerald-700">{order.delivery_date || "Within 24 Hours"}</strong> (24hr Return)</span>
                </div>
                <div className="flex items-start gap-1.5 pt-1 border-t border-slate-100">
                  <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span className="text-slate-600">{fullAddress}</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 space-y-1.5">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">
                Financial Settlement Breakdown
              </span>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Service Subtotal:</span>
                  <span className="font-bold text-slate-800">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Detergent Formulation:</span>
                  <span className={detFee === 0 ? "text-emerald-700 font-bold" : "font-bold text-slate-800"}>
                    {detFee === 0 ? "FREE (Included)" : formatCurrency(detFee)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Doorstep Logistics (2-Way):</span>
                  <span className={deliveryFee === 0 ? "text-emerald-700 font-bold" : "font-bold text-slate-800"}>
                    {deliveryFee === 0 ? "FREE ($0.00)" : formatCurrency(deliveryFee)}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Coupon Savings {order.coupon_code ? `(${order.coupon_code})` : ""}:</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1.5 border-t border-slate-200 font-black text-xs text-slate-900">
                  <span>Total Settled:</span>
                  <span className="text-primary text-sm">{formatCurrency(order.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Secure Transaction Reference — NO Stripe redirect! */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-white border border-slate-200">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Stripe Gateway Authorization Reference
                </span>
                <span className="font-mono text-xs font-bold text-slate-800 select-all">
                  {txId}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyTx}
              className="h-7 text-[11px] font-bold gap-1 cursor-pointer shrink-0"
            >
              {copiedTxn ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              {copiedTxn ? "Copied" : "Copy Ref"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

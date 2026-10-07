"use client";

import * as React from "react";
import { Sparkles, Scale, ShieldCheck } from "lucide-react";
import type { CalculatedPriceResult } from "@/lib/stripe/pricing-calc";
import type { PricingMode } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface OrderSummaryCardProps {
  priceResult: CalculatedPriceResult;
  pricingMode?: PricingMode;
  bagCount?: number;
  weightLbs?: number;
}

export function OrderSummaryCard({
  priceResult,
  pricingMode = "per_bag",
  bagCount = 2,
  weightLbs = 15,
}: OrderSummaryCardProps) {
  const { subtotal, detergent_fee, delivery_fee, discount_amount, total_amount, breakdown } = priceResult;
  const isFreeDelivery = delivery_fee === 0 && subtotal > 0;

  const weightDisplay = React.useMemo(() => {
    if (pricingMode === "per_bag") return `${bagCount} Bag(s) · ${bagCount * 13} Gal (~${(bagCount * 15).toFixed(0)} lbs)`;
    if (pricingMode === "per_lb") return `${weightLbs.toFixed(0)} lbs Weighed Laundry`;
    return `${breakdown.unit_count} ${breakdown.unit_name} Package`;
  }, [pricingMode, bagCount, weightLbs, breakdown]);

  return (
    <div className="bg-white rounded-2xl border-2 border-pink-100 shadow-md p-6 space-y-4 sticky top-24">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h4 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Live Price
        </h4>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 uppercase">
          Live
        </span>
      </div>

      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-700 font-bold">
          <Scale className="h-4 w-4 text-primary" />
          <span>Est. Weight:</span>
        </div>
        <span className="font-black text-slate-900">{weightDisplay}</span>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between text-slate-600">
          <span>Laundry Wash ({breakdown.unit_count} {breakdown.unit_name})</span>
          <span className="font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between items-center text-slate-600">
          <span>Detergent Formulation</span>
          <span className={detergent_fee === 0 ? "font-bold text-emerald-600" : "font-semibold text-slate-900"}>
            {detergent_fee === 0 ? "FREE (Included)" : `+${formatCurrency(detergent_fee)}`}
          </span>
        </div>
        <div className="flex justify-between items-center text-slate-600">
          <span>Doorstep Delivery {isFreeDelivery && <span className="text-[10px] font-bold text-emerald-700 ml-1">FREE</span>}</span>
          <span className={isFreeDelivery ? "font-bold text-emerald-600" : "font-semibold text-slate-900"}>
            {isFreeDelivery ? "$0.00" : formatCurrency(delivery_fee)}
          </span>
        </div>
        {discount_amount > 0 && (
          <div className="flex justify-between text-emerald-600 font-medium">
            <span>Coupon Discount</span>
            <span>-{formatCurrency(discount_amount)}</span>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
        <span className="text-xs text-slate-500 font-medium">Estimated Total</span>
        <span className="text-2xl font-black text-slate-900 tracking-tight">{formatCurrency(total_amount)}</span>
      </div>
      {pricingMode === "per_lb" && (
        <div className="p-2 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-800 font-semibold flex items-center justify-between">
          <span>Due Today:</span>
          <span className="font-extrabold text-amber-900">$0.00 (Card Authorized)</span>
        </div>
      )}

      <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
        <span>Secure 256-bit Encrypted Checkout</span>
      </div>
    </div>
  );
}

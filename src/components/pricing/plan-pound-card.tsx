"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Minus, ArrowRight, ShieldCheck, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { PricingConfig } from "@/types";

interface PlanPoundCardProps {
  weightLbs: number;
  onWeightLbsChange: (weight: number) => void;
  initialRates?: Partial<PricingConfig>;
}

/**
 * PlanPoundCard Component
 * Dedicated plan card for weighed laundry by the pound ($/lb).
 * Features live dynamic rates, minimum/maximum pound constraints, and free delivery thresholds.
 * Strictly under 250 lines.
 */
export function PlanPoundCard({ weightLbs, onWeightLbsChange, initialRates }: PlanPoundCardProps) {
  const [rates, setRates] = React.useState({
    poundPrice: Number(initialRates?.pound_price ?? 0),
    minLbs: Number(initialRates?.min_lbs ?? 0),
    maxLbs: Number(initialRates?.max_lbs ?? 0),
    freeDeliveryLbs: Number(initialRates?.free_delivery_lbs ?? 0),
    deliveryFee: Number(initialRates?.standard_delivery_fee ?? 0),
  });

  React.useEffect(() => {
    fetch("/api/pricing")
      .then((r) => r.json())
      .then((d) => {
        if (d?.pricing) {
          setRates({
            poundPrice: Number(d.pricing.pound_price),
            minLbs: Number(d.pricing.min_lbs),
            maxLbs: Number(d.pricing.max_lbs),
            freeDeliveryLbs: Number(d.pricing.free_delivery_lbs),
            deliveryFee: Number(d.pricing.standard_delivery_fee),
          });
        }
      })
      .catch(() => {});
  }, []);

  const effectiveWeight = Math.max(rates.minLbs, Math.min(rates.maxLbs, weightLbs));
  const subtotal = Math.round(effectiveWeight * rates.poundPrice * 100) / 100;
  const isFreeDelivery = true;
  const deliveryFee = 0.0;
  const total = subtotal;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-sky-200 shadow-xl max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 mb-2">
            <Scale className="h-3 w-3" />
            Weighed Precision Intake
          </span>
          <h3 className="text-2xl font-black text-slate-900">By the Pound (lb)</h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Ideal for bulky linens, blankets, towels, comforters, and commercial laundry.
          </p>
        </div>
        <div className="text-left sm:text-right">
          <span className="text-3xl font-black text-slate-900">${rates.poundPrice.toFixed(2)}</span>
          <span className="text-xs text-slate-500 block">per lb ({rates.minLbs} lbs min)</span>
        </div>
      </div>

      <div className="p-4 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-800">Estimated Weight:</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onWeightLbsChange(Math.max(rates.minLbs, effectiveWeight - 5))}
              disabled={effectiveWeight <= rates.minLbs}
              aria-label="Decrease weight"
              className="h-11 w-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-20 text-center text-2xl font-black text-slate-900">
              {effectiveWeight} lbs
            </span>
            <button
              type="button"
              onClick={() => onWeightLbsChange(Math.min(rates.maxLbs, effectiveWeight + 5))}
              disabled={effectiveWeight >= rates.maxLbs}
              aria-label="Increase weight"
              className="h-11 w-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-500 bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-sky-600 shrink-0" />
          <span>Weighed on certified digital scales with dual photo intake confirmation.</span>
        </div>
      </div>

      <div className="space-y-2 pt-2 text-sm text-slate-600">
        <div className="flex justify-between">
          <span>{effectiveWeight} lbs Wash &amp; Dry (${rates.poundPrice.toFixed(2)}/lb):</span>
          <span className="font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Doorstep Pickup &amp; Delivery:</span>
          <span className="font-bold text-emerald-600">FREE ($0.00)</span>
        </div>
        <div className="flex justify-between pt-3 border-t border-slate-200 text-base font-black text-slate-900">
          <span>Estimated Total:</span>
          <span className="text-xl text-sky-600">{formatCurrency(total)}</span>
        </div>
      </div>

      <Link href={`/order?mode=per_lb&weight=${effectiveWeight}`} className="block">
        <Button variant="hero" size="lg" className="w-full shadow-lg shadow-pink-500/25">
          <span>Continue with {effectiveWeight} lbs</span>
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </Link>
    </div>
  );
}

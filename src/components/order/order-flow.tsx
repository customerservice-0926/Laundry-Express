"use client";

import { useSearchParams } from "next/navigation";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { useAuth } from "@/context/auth-context";
import type { PricingMode, PricingConfig } from "@/types";
import { Lock, Clock, Truck } from "lucide-react";


export interface OrderFlowProps {
  initialPricing?: PricingConfig;
}

export function OrderFlow({ initialPricing }: OrderFlowProps) {
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading } = useAuth();

  const packageParam = searchParams.get("package");
  const modeParam = searchParams.get("mode") as PricingMode | null;
  const initialMode: PricingMode = modeParam === "per_lb" || modeParam === "package" ? modeParam : "per_bag";

  const bagsParam = searchParams.get("bags");
  const minBags = initialPricing?.min_bags ?? 1;
  const initialBagCount = bagsParam ? Math.max(minBags, parseInt(bagsParam, 10) || minBags) : minBags;

  const minLbs = initialPricing?.min_lbs ?? 0;
  const weightParam = searchParams.get("lbs") || searchParams.get("weight");
  const initialWeightLbs = weightParam ? Math.max(minLbs, parseFloat(weightParam) || minLbs) : minLbs;

  const initialPackageId = packageParam ?? undefined;

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="space-y-6 animate-pulse py-8">
        <div className="h-16 bg-slate-100 rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-32 bg-slate-100 rounded-2xl" />
            <div className="h-40 bg-slate-100 rounded-2xl" />
          </div>
          <div className="h-80 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <BookingWizard
        initialMode={initialMode}
        initialBagCount={initialBagCount}
        initialWeightLbs={initialWeightLbs}
        initialPackageId={initialPackageId}
        initialPricing={initialPricing}
        currentUser={user}
      />

      {/* Operational Trust & Security Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-200">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Encrypted Stripe Checkout</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Cards, Apple Pay, &amp; Google Pay securely processed with 256-bit encryption.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Strict Operating Windows</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Pickup & delivery within admin-configured windows. Same-day slots close at window start.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Truck className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">
              {initialPricing
                ? `Free Delivery on ${initialPricing.free_delivery_threshold}+ Bags or ${initialPricing.free_delivery_lbs}+ lbs`
                : "Delivery rules set by Laundry Express"}
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Orders meeting the bag or weight threshold receive free standard delivery automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

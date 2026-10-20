import { Plus, Minus, ShoppingBag, Zap, Scale } from "lucide-react";
import type { PricingMode } from "@/types";
import type { PackagePlan } from "@/lib/services/pricing-plan-service";
import { cn } from "@/lib/utils";

interface StepBagCounterProps {
  pricingMode: PricingMode;
  bagCount: number;
  onBagCountChange: (count: number) => void;
  minBags: number;
  maxBags: number;
  weightLbs?: number;
  onWeightLbsChange?: (lbs: number) => void;
  bagPrice: number;
  freeDeliveryBags: number;
  minLbs: number;
  maxLbs: number;
  freeDeliveryLbs: number;
  packages?: PackagePlan[];
  selectedPackageId?: string;
  onSelectPackage?: (id: string) => void;
}

export function StepBagCounter({
  pricingMode,
  bagCount,
  onBagCountChange,
  minBags,
  maxBags,
  weightLbs,
  onWeightLbsChange,
  bagPrice,
  freeDeliveryBags,
  minLbs,
  maxLbs,
  freeDeliveryLbs,
  packages = [],
  selectedPackageId,
  onSelectPackage,
}: StepBagCounterProps) {
  const currentLbs = weightLbs ?? minLbs;
  const handleLbsChange = (val: number) => {
    onWeightLbsChange?.(val);
  };

  if (pricingMode === "package") {
    return (
      <div className="space-y-3 p-5 rounded-2xl bg-white border border-slate-200">
        <h5 className="font-bold text-sm text-slate-900">Select a Package</h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {packages.map((pkg) => {
            const isSelected = pkg.id === selectedPackageId;
            return (
              <button
                key={pkg.id}
                type="button"
                onClick={() => onSelectPackage?.(pkg.id)}
                className={cn(
                  "text-left p-4 rounded-xl border-2 transition-colors",
                  isSelected ? "border-sky-600 bg-sky-50/70" : "border-slate-200 hover:border-slate-300"
                )}
              >
                <span className="block font-bold text-sm text-slate-900 break-words">{pkg.name}</span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  {pkg.capacity} {pkg.unit_type === "lb" ? "lbs" : "bags"} included
                </span>
                <span className="block font-extrabold text-sm text-sky-700 mt-2">${pkg.discounted_price.toFixed(2)}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (pricingMode === "per_lb") {
    const isFreePoundDelivery = currentLbs >= freeDeliveryLbs;

    return (
      <div className="space-y-4 p-5 rounded-2xl bg-white border border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-sky-600" />
            <h5 className="font-bold text-sm text-slate-900">Estimated Laundry Weight (lbs)</h5>
          </div>
          <span className="text-xs font-semibold text-slate-500">Min {minLbs} lbs • Max {maxLbs} lbs</span>
        </div>

        <div className="flex items-center gap-4">
          <input
            type="range"
            min={minLbs}
            max={maxLbs}
            step="1"
            value={currentLbs}
            onChange={(e) => handleLbsChange(parseFloat(e.target.value) || minLbs)}
            className="w-full accent-sky-600 cursor-pointer h-2 bg-slate-100 rounded-lg"
          />
          <div className="px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200 font-extrabold text-sky-800 text-sm whitespace-nowrap">
            {currentLbs.toFixed(0)} lbs
          </div>
        </div>

        {currentLbs >= freeDeliveryLbs ? (
          <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center justify-between">
            <span>🎉 Doorstep pickup &amp; delivery is 100% FREE for orders {freeDeliveryLbs}+ lbs!</span>
            <span className="font-black text-emerald-700">FREE ($0.00)</span>
          </div>
        ) : (
          <div className="p-3 rounded-xl border border-sky-200 bg-sky-50 text-sky-800 text-xs font-medium flex items-center justify-between">
            <span>💡 Add <strong>{(freeDeliveryLbs - currentLbs).toFixed(0)} more lbs</strong> to unlock FREE pickup &amp; delivery!</span>
            <span className="font-bold text-sky-700">Free at {freeDeliveryLbs} lbs</span>
          </div>
        )}

        <p className="text-xs text-slate-500">
          ℹ️ Our driver will weigh your laundry on a calibrated digital scale at pickup to verify final intake weight.
        </p>
      </div>
    );
  }

  // per_bag mode
  const isFreeDelivery = bagCount >= freeDeliveryBags;

  return (
    <div className="space-y-4 p-5 rounded-2xl bg-white border border-slate-200">
      <div className="flex items-center justify-between">
        <div>
          <h5 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-sky-600" />
            Select Laundry Bags
          </h5>
          <p className="text-xs text-slate-500 mt-0.5">${bagPrice.toFixed(2)} per 13-gallon bag (about 2 loads)</p>
        </div>

        {/* Quantity Stepper */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onBagCountChange(Math.max(minBags, bagCount - 1))}
            disabled={bagCount <= minBags}
            className="h-9 w-9 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 flex items-center justify-center hover:bg-slate-100 disabled:opacity-40 transition-colors"
          >
            <Minus className="h-4 w-4" />
          </button>

          <span className="font-extrabold text-lg text-slate-900 w-8 text-center">
            {bagCount}
          </span>

          <button
            type="button"
            onClick={() => onBagCountChange(bagCount + 1)}
            disabled={bagCount >= maxBags}
            className="h-9 w-9 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 flex items-center justify-center hover:bg-slate-100 disabled:opacity-40 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Free Delivery Banner */}
      <div className={cn(
        "p-3 rounded-xl border text-xs flex items-center justify-between",
        isFreeDelivery ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-sky-200 bg-sky-50 text-sky-800"
      )}>
        <div className="flex items-center gap-2 min-w-0">
          <Zap className={cn("h-4 w-4 shrink-0", isFreeDelivery ? "text-emerald-600 fill-emerald-600" : "text-sky-600")} />
          <span className="leading-snug">
            {isFreeDelivery ? (
              <><strong>100% Free Delivery!</strong> Orders with {freeDeliveryBags}+ bags qualify for <strong>$0.00</strong> pickup &amp; delivery.</>
            ) : (
              <>Add <strong>{freeDeliveryBags - bagCount} more bag{freeDeliveryBags - bagCount > 1 ? "s" : ""}</strong> to unlock free pickup &amp; delivery!</>
            )}
          </span>
        </div>
        <span className={cn("font-black shrink-0 ml-2", isFreeDelivery ? "text-emerald-700" : "text-sky-700")}>
          {isFreeDelivery ? "FREE ($0.00)" : `Free at ${freeDeliveryBags} bags`}
        </span>
      </div>
    </div>
  );
}

import { ShoppingBag, Scale, Sparkles, Gift } from "lucide-react";
import type { PricingMode } from "@/types";
import { cn } from "@/lib/utils";

interface StepPricingModeProps {
  selectedMode: PricingMode;
  onSelectMode: (mode: PricingMode) => void;
  bagPrice: number;
  poundPrice: number;
  minLbs: number;
  freeDeliveryBags: number;
  freeDeliveryLbs: number;
  packageFromPrice?: number;
}

export function StepPricingMode({
  selectedMode,
  onSelectMode,
  bagPrice,
  poundPrice,
  minLbs,
  freeDeliveryBags,
  freeDeliveryLbs,
  packageFromPrice,
}: StepPricingModeProps) {
  const modes: Array<{
    id: PricingMode;
    title: string;
    badge: string;
    description: string;
    priceLabel: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: "per_bag",
      title: "By the Bag (Most Popular)",
      badge: `${freeDeliveryBags}+ Bags = Free Delivery`,
      description: "Fill our 13-gallon bag (about 2 loads). Doorstep pickup, returned in 24 hours.",
      priceLabel: `$${bagPrice.toFixed(2)} / bag`,
      icon: ShoppingBag,
    },
    {
      id: "per_lb",
      title: "By Weight (Per Pound / lb)",
      badge: `${freeDeliveryLbs}+ lbs = Free Delivery`,
      description: "Pay purely by weighed volume. Weighed on precision scale at our facility.",
      priceLabel: `$${poundPrice.toFixed(2)} / lb (${minLbs} lbs min)`,
      icon: Scale,
    },
    ...(packageFromPrice ? [{
      id: "package" as const,
      title: "Saver Package",
      badge: "Free Delivery",
      description: "Prepaid bundles set by Laundry Express at a discounted rate.",
      priceLabel: `From $${packageFromPrice.toFixed(2)}`,
      icon: Gift,
    }] : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-amber-500" />
        <h4 className="text-base font-bold text-slate-900">
          Step 1: Choose Your Laundry Service Model
        </h4>
      </div>

      <div className={cn("grid grid-cols-1 gap-4", modes.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2")}>
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isSelected = selectedMode === mode.id;

          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onSelectMode(mode.id)}
              className={cn(
                "relative text-left p-5 rounded-2xl border-2 transition-all duration-200 flex flex-col justify-between",
                isSelected
                  ? "border-sky-600 bg-sky-50/70 shadow-md ring-2 ring-sky-500/20"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div
                    className={cn(
                      "p-2.5 rounded-xl",
                      isSelected ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border",
                      isSelected
                        ? "bg-rose-100 text-rose-700 border-rose-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    )}
                  >
                    {mode.badge}
                  </span>
                </div>

                <h5 className="font-bold text-slate-900 text-sm">{mode.title}</h5>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {mode.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="font-extrabold text-sm text-sky-700">{mode.priceLabel}</span>
                <span
                  className={cn(
                    "h-4 w-4 rounded-full border flex items-center justify-center",
                    isSelected ? "border-sky-600 bg-sky-600" : "border-slate-300 bg-white"
                  )}
                >
                  {isSelected && <span className="h-2 w-2 rounded-full bg-white" />}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

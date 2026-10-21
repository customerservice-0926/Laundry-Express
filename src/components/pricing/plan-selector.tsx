"use client";

import * as React from "react";
import { ShoppingBag, Scale, Gift } from "lucide-react";
import { PlanBagCard } from "./plan-bag-card";
import { PlanPoundCard } from "./plan-pound-card";
import { PlanPackagesGrid } from "./plan-packages-grid";
import type { PricingConfig } from "@/types";

export type PlanCategory = "bag" | "pound" | "package";

interface PlanSelectorProps {
  initialRates?: Partial<PricingConfig>;
}

/**
 * PlanSelector Component
 * Provides a mobile-native segmented switcher allowing users to choose between:
 * 1. By the Bag
 * 2. By the Pound (weighed intake with min/max requirements and free delivery threshold)
 * 3. Saver Bundles
 */
export function PlanSelector({ initialRates }: PlanSelectorProps) {
  const [activeTab, setActiveTab] = React.useState<PlanCategory>("bag");
  const [bagCount, setBagCount] = React.useState<number>(2);
  const [weightLbs, setWeightLbs] = React.useState<number>(() => Number(initialRates?.min_lbs ?? 15));

  return (
    <section aria-label="Laundry Plan Selector" className="space-y-8">
      {/* Segmented Switcher for Desktop, Tablet, and Mobile */}
      <div className="flex justify-center">
        <div
          role="tablist"
          aria-label="Pricing Categories"
          className="inline-flex p-1.5 rounded-2xl bg-slate-100 border border-slate-200/80 shadow-inner max-w-lg w-full"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "bag"}
            onClick={() => setActiveTab("bag")}
            className={`flex-1 min-h-[44px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer ${
              activeTab === "bag"
                ? "bg-white text-sky-700 shadow-md scale-100"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShoppingBag className="h-4 w-4 shrink-0" />
            <span className="truncate">By the Bag</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "pound"}
            onClick={() => setActiveTab("pound")}
            className={`flex-1 min-h-[44px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer ${
              activeTab === "pound"
                ? "bg-white text-sky-700 shadow-md scale-100"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Scale className="h-4 w-4 shrink-0" />
            <span className="truncate">By the Pound</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "package"}
            onClick={() => setActiveTab("package")}
            className={`flex-1 min-h-[44px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer ${
              activeTab === "package"
                ? "bg-white text-sky-700 shadow-md scale-100"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Gift className="h-4 w-4 shrink-0" />
            <span className="truncate">Saver Bundles</span>
          </button>
        </div>
      </div>

      {/* Tab 1: By the Bag */}
      {activeTab === "bag" && (
        <PlanBagCard
          bagCount={bagCount}
          onBagCountChange={setBagCount}
          initialRates={initialRates}
        />
      )}

      {/* Tab 2: By the Pound */}
      {activeTab === "pound" && (
        <PlanPoundCard
          weightLbs={weightLbs}
          onWeightLbsChange={setWeightLbs}
          initialRates={initialRates}
        />
      )}

      {/* Tab 3: Saver Bundles */}
      {activeTab === "package" && <PlanPackagesGrid />}
    </section>
  );
}

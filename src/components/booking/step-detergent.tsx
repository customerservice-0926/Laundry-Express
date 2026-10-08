"use client";

import { Sparkles, Check, Droplets, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DetergentItem } from "@/lib/services/catalog-service";

interface StepDetergentProps {
  selectedDetergentId: string;
  onSelectDetergent: (id: string) => void;
  showError?: boolean;
  detergents: DetergentItem[];
  isLoading: boolean;
  loadError: string;
}

export function StepDetergent({
  selectedDetergentId,
  onSelectDetergent,
  showError = false,
  detergents,
  isLoading,
  loadError,
}: StepDetergentProps) {
  const isDetergentMissing = showError && !selectedDetergentId;

  return (
    <div className="space-y-6 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h5 className="font-bold text-sm text-slate-900">Step 2: Wash Detergent Formulation</h5>
        </div>
        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
          All Formulas Included
        </span>
      </div>

      {/* Standard Cold Water Eco-Wash Assurance */}
      <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200/80 flex items-start gap-3 text-xs">
        <Droplets className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold text-sky-950 block">Standard 100% Cold Water Wash</span>
          <p className="text-[11px] text-sky-800 leading-relaxed">
            All laundry is sanitized using professional cold-water cycles (30°C) to protect fibers, maintain colors, and prevent fabric shrinkage.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
            Choose Wash Detergent Formula *
          </label>
          {!selectedDetergentId && (
            <span className={cn("text-[11px] font-bold", showError ? "text-rose-500" : "text-slate-400")}>
              {showError ? "Selection Required" : "Required"}
            </span>
          )}
        </div>

        {isDetergentMissing && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>Please select a wash detergent formula below to continue.</span>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-pulse">
            <div className="h-20 rounded-xl bg-slate-100" />
            <div className="h-20 rounded-xl bg-slate-100" />
          </div>
        ) : loadError ? (
          <p role="alert" className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">{loadError}</p>
        ) : detergents.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
            No detergent options are available. Please contact support before placing an order.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {detergents.map((detergent) => {
              const isSelected = selectedDetergentId === detergent.id;
              return (
                <button
                  key={detergent.id}
                  type="button"
                  onClick={() => onSelectDetergent(detergent.id)}
                  className={cn(
                    "p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer",
                    isSelected
                      ? "border-primary bg-pink-50/40 ring-2 ring-primary/20 shadow-2xs"
                      : isDetergentMissing
                      ? "border-rose-300 bg-rose-50/20 hover:border-rose-400"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">{detergent.name}</span>
                        {Number(detergent.price || 0) > 0 ? (
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            +${Number(detergent.price).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            FREE (Included)
                          </span>
                        )}
                      </div>
                      {isSelected ? (
                        <div className="h-4 w-4 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                          <Check className="h-2.5 w-2.5 stroke-3" />
                        </div>
                      ) : (
                        <div className="h-4 w-4 rounded-full border border-slate-300 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">{detergent.description}</p>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 mt-2 block uppercase tracking-wider">
                    {detergent.brand} • {detergent.type}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

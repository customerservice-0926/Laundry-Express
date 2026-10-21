"use client";

import * as React from "react";
import { Heart, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface StepTipSelectorProps {
  tipAmount: number;
  onTipChange: (amount: number) => void;
}

const PRESET_TIPS = [
  { value: 0, label: "No Tip", detail: "$0" },
  { value: 3, label: "$3.00", detail: "Friendly" },
  { value: 5, label: "$5.00", detail: "Great Service" },
  { value: 10, label: "$10.00", detail: "Superstar" },
] as const;

export function StepTipSelector({ tipAmount, onTipChange }: StepTipSelectorProps) {
  const [isCustom, setIsCustom] = React.useState(
    () => !PRESET_TIPS.some((p) => p.value === tipAmount) && tipAmount > 0
  );
  const [customValue, setCustomValue] = React.useState(
    () => (isCustom ? String(tipAmount) : "")
  );

  const handleSelectPreset = (value: number) => {
    setIsCustom(false);
    setCustomValue("");
    onTipChange(value);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setCustomValue(raw);
    const parsed = parseFloat(raw);
    if (!isNaN(parsed) && parsed >= 0) {
      onTipChange(Math.round(parsed * 100) / 100);
    } else {
      onTipChange(0);
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-emerald-600 fill-emerald-600 shrink-0" />
          <span className="font-extrabold text-xs text-slate-900">
            Driver &amp; Service Gratuity (Tip)
          </span>
        </div>
        <span className="text-[11px] font-bold text-emerald-600">
          {tipAmount > 0 ? `+${formatCurrency(tipAmount)} Added` : "Optional"}
        </span>
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed">
        100% of tips support our drivers and facility washing crew for prompt, careful service.
      </p>

      {/* Preset Chips Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
        {PRESET_TIPS.map((preset) => {
          const isSelected = !isCustom && tipAmount === preset.value;
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => handleSelectPreset(preset.value)}
              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                isSelected
                  ? "bg-emerald-50 border-emerald-400 text-emerald-900 shadow-xs ring-1 ring-emerald-400"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span className="block font-black text-xs">{preset.label}</span>
              <span className="block text-[10px] text-slate-400 font-medium">{preset.detail}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => {
            setIsCustom(true);
            if (!customValue) onTipChange(0);
          }}
          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
            isCustom
              ? "bg-emerald-50 border-emerald-400 text-emerald-900 shadow-xs ring-1 ring-emerald-400"
              : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
          }`}
        >
          <span className="block font-black text-xs">Custom</span>
          <span className="block text-[10px] text-slate-400 font-medium">Other $</span>
        </button>
      </div>

      {isCustom && (
        <div className="pt-2 flex items-center gap-2">
          <div className="relative w-full max-w-[180px]">
            <DollarSign className="h-4 w-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="number"
              min="0"
              step="1"
              value={customValue}
              onChange={handleCustomChange}
              placeholder="e.g. 7.00"
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Enter custom dollar amount</span>
        </div>
      )}
    </div>
  );
}

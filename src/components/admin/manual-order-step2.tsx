"use client";

import * as React from "react";
import { Calendar, ShoppingBag, Scale } from "lucide-react";
import type { DetergentItem } from "@/lib/services/catalog-service";
import { formatCurrency } from "@/lib/utils";
import type { ManualOrderFormState, ManualOrderFieldChange } from "./manual-order-types";

interface Step2Props {
  form: ManualOrderFormState;
  onChange: ManualOrderFieldChange;
  detergents: DetergentItem[];
}

export function ManualOrderStep2({ form, onChange, detergents }: Step2Props) {
  const todayStr = React.useMemo(() => new Date().toISOString().split("T")[0], []);

  return (
    <div className="space-y-4 py-1">
      {/* Laundry Mode Selection */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
          Select Wash Service Plan
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onChange("pricing_mode", "per_bag")}
            className={`p-3.5 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer ${
              form.pricing_mode === "per_bag"
                ? "border-primary bg-pink-50/60 ring-2 ring-primary/20"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className={`p-2 rounded-xl shrink-0 ${form.pricing_mode === "per_bag" ? "bg-primary text-white" : "bg-slate-100 text-slate-600"}`}>
              <ShoppingBag className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">By The Bag</div>
              <div className="text-[11px] text-slate-500 font-normal">13 Gallon standard bag</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onChange("pricing_mode", "per_lb")}
            className={`p-3.5 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer ${
              form.pricing_mode === "per_lb"
                ? "border-primary bg-pink-50/60 ring-2 ring-primary/20"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className={`p-2 rounded-xl shrink-0 ${form.pricing_mode === "per_lb" ? "bg-primary text-white" : "bg-slate-100 text-slate-600"}`}>
              <Scale className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">By The Pound</div>
              <div className="text-[11px] text-slate-500 font-normal">Charged by scale weight (lbs)</div>
            </div>
          </button>
        </div>
      </div>

      {/* Quantity & Detergent */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {form.pricing_mode === "per_bag" ? "Number of Bags (13 Gal)" : "Estimated Weight (lbs)"}
          </label>
          <input
            type="number"
            min={1}
            value={form.pricing_mode === "per_bag" ? form.bag_count : form.estimated_weight_lbs}
            onChange={(e) => {
              const val = Math.max(1, Number(e.target.value) || 1);
              if (form.pricing_mode === "per_bag") onChange("bag_count", val);
              else onChange("estimated_weight_lbs", val);
            }}
            className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
          />
          <p className="mt-1 text-[11px] text-slate-500 font-medium">
            {form.pricing_mode === "per_bag" ? "≈ 13 Gal hamper bag (~15 lbs)" : "Verified on digital scale at arrival"}
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Wash Detergent</label>
          <select
            value={form.detergent_id}
            onChange={(e) => onChange("detergent_id", e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
          >
            {detergents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} {d.price > 0 ? `(+${formatCurrency(d.price)})` : "(Free)"}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pickup Scheduling */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
          <Calendar className="h-4 w-4 text-primary" />
          <span>Pickup Scheduling</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pickup Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              min={todayStr}
              value={form.pickup_date}
              onChange={(e) => onChange("pickup_date", e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pickup Window <span className="text-rose-500">*</span>
            </label>
            <select
              value={form.pickup_slot}
              onChange={(e) => onChange("pickup_slot", e.target.value as "8am-12pm" | "1pm-6pm")}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
            >
              <option value="8am-12pm">Morning Window (8:00 AM – 12:00 PM)</option>
              <option value="1pm-6pm">Afternoon Window (1:00 PM – 6:00 PM)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Special Phone Call / Gate Instructions <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <input
            type="text"
            value={form.special_instructions}
            onChange={(e) => onChange("special_instructions", e.target.value)}
            placeholder="e.g. Ring buzzer twice; customer cannot walk to door fast"
            className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
          />
        </div>
      </div>
    </div>
  );
}

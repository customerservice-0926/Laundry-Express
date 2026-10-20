"use client";

import * as React from "react";
import { Calendar, ShoppingBag, Scale, Layers } from "lucide-react";
import type { DetergentItem } from "@/lib/services/catalog-service";
import type { PackagePlan } from "@/lib/services/pricing-plan-service";
import type { AdditionalItem } from "@/types";
import { formatCurrency, cn } from "@/lib/utils";
import { ManualOrderAddItems } from "./manual-order-add-items";
import type { ManualOrderFormState, ManualOrderFieldChange } from "./manual-order-types";

interface Step2Props {
  form: ManualOrderFormState;
  onChange: ManualOrderFieldChange;
  detergents: DetergentItem[];
  packages?: PackagePlan[];
  additionalItems?: AdditionalItem[];
}

export function ManualOrderStep2({
  form,
  onChange,
  detergents,
  packages = [],
  additionalItems = [],
}: Step2Props) {
  const todayStr = React.useMemo(() => new Date().toISOString().split("T")[0], []);

  const handleUpdateAddItem = (item: AdditionalItem, delta: number) => {
    const existing = form.additional_items.find((i) => i.id === item.id);
    const currentQty = existing?.quantity || 0;
    const nextQty = Math.max(0, currentQty + delta);

    let updated = [...form.additional_items];
    if (nextQty === 0) {
      updated = updated.filter((i) => i.id !== item.id);
    } else if (existing) {
      updated = updated.map((i) => (i.id === item.id ? { ...i, quantity: nextQty } : i));
    } else {
      updated.push({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: nextQty,
      });
    }
    onChange("additional_items", updated);
  };

  const handleSelectPackage = (pkgId: string) => {
    const pkg = packages.find((p) => p.id === pkgId);
    if (!pkg) return;
    onChange("package_id", pkg.id);
    onChange("package_name", pkg.name);
    onChange("package_price", pkg.discounted_price);
    if (pkg.unit_type === "bag") onChange("bag_count", pkg.capacity);
    else onChange("estimated_weight_lbs", pkg.capacity);
  };

  return (
    <div className="space-y-4 py-1 text-xs">
      {/* 1. Wash Service Plan (Bag, Lb, Package) */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
          Select Wash Service Plan
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "per_bag" as const, label: "By The Bag", sub: "13 Gal bag", icon: ShoppingBag },
            { id: "per_lb" as const, label: "By The Pound", sub: "Digital scale lbs", icon: Scale },
            { id: "package" as const, label: "Packages", sub: "Bundle deals", icon: Layers },
          ].map((mode) => {
            const Icon = mode.icon;
            const active = form.pricing_mode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => {
                  onChange("pricing_mode", mode.id);
                  if (mode.id === "package" && packages.length > 0 && !form.package_id) {
                    handleSelectPackage(packages[0].id);
                  }
                }}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition flex items-center gap-2 cursor-pointer",
                  active ? "border-primary bg-pink-50/70 ring-2 ring-primary/20" : "border-slate-200 bg-white hover:border-slate-300"
                )}
              >
                <div className={cn("p-1.5 rounded-lg shrink-0", active ? "bg-primary text-white" : "bg-slate-100 text-slate-600")}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 truncate">{mode.label}</div>
                  <div className="text-[10px] text-slate-500 truncate">{mode.sub}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Package Selector or Standard Inputs */}
      {form.pricing_mode === "package" ? (
        <div className="p-3 rounded-xl bg-pink-50/40 border border-pink-200 space-y-2">
          <label className="block text-[11px] font-bold text-slate-700">Choose Admin Package Plan</label>
          {packages.length > 0 ? (
            <select
              value={form.package_id || packages[0]?.id || ""}
              onChange={(e) => handleSelectPackage(e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name} — {formatCurrency(pkg.discounted_price)} ({pkg.capacity} {pkg.unit_type === "bag" ? "Bags" : "lbs"})
                </option>
              ))}
            </select>
          ) : (
            <p className="text-[11px] text-slate-500">No custom packages created yet.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
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
              className="w-full h-9 px-3 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Wash Detergent</label>
            <select
              value={form.detergent_id}
              onChange={(e) => onChange("detergent_id", e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              {detergents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.price > 0 ? `(+${formatCurrency(d.price)})` : "(Free)"}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <ManualOrderAddItems
        items={additionalItems}
        selected={form.additional_items}
        onUpdate={handleUpdateAddItem}
      />

      {/* 3. Delivery System: Pickup & Drop-off Scheduling */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2 font-bold text-slate-800 uppercase tracking-wider text-[11px]">
          <Calendar className="h-3.5 w-3.5 text-primary" /> Delivery Scheduling
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Pickup Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              min={todayStr}
              value={form.pickup_date}
              onChange={(e) => onChange("pickup_date", e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Pickup Window <span className="text-rose-500">*</span>
            </label>
            <select
              value={form.pickup_slot}
              onChange={(e) => onChange("pickup_slot", e.target.value as "8am-12pm" | "1pm-6pm")}
              className="w-full h-9 px-3 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              <option value="8am-12pm">Morning Window (8:00 AM – 12:00 PM)</option>
              <option value="1pm-6pm">Afternoon Window (1:00 PM – 6:00 PM)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>Delivery / Drop-off Date</span>
              <span className="text-[10px] text-slate-400 font-normal">Optional</span>
            </label>
            <input
              type="date"
              min={form.pickup_date || todayStr}
              value={form.delivery_date}
              onChange={(e) => onChange("delivery_date", e.target.value)}
              placeholder="Standard 24-hr return"
              className="w-full h-9 px-3 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="mt-0.5 text-[10px] text-slate-500">Leave blank for standard 24-hour return</p>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Delivery Window</label>
            <select
              value={form.delivery_slot || "1pm-6pm"}
              onChange={(e) => onChange("delivery_slot", e.target.value as "8am-12pm" | "1pm-6pm")}
              className="w-full h-9 px-3 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              <option value="8am-12pm">Morning Window (8:00 AM – 12:00 PM)</option>
              <option value="1pm-6pm">Afternoon Window (1:00 PM – 6:00 PM)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
            Special Phone Call / Gate Instructions <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <input
            type="text"
            value={form.special_instructions}
            onChange={(e) => onChange("special_instructions", e.target.value)}
            placeholder="e.g. Ring buzzer twice; customer cannot walk to door fast"
            className="w-full h-9 px-3 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { Sparkles, Plus, Minus, Tag } from "lucide-react";
import type { AdditionalItem } from "@/types";
import { formatCurrency, cn } from "@/lib/utils";
import type { ManualOrderAdditionalItem } from "./manual-order-types";

interface AddItemsProps {
  items: AdditionalItem[];
  selected: ManualOrderAdditionalItem[];
  onUpdate: (item: AdditionalItem, delta: number) => void;
  disabled?: boolean;
  onAddCustom?: (customItem: { name: string; price: number }) => void;
}

export function ManualOrderAddItems({
  items,
  selected,
  onUpdate,
  disabled = false,
  onAddCustom,
}: AddItemsProps) {
  const [showCustom, setShowCustom] = React.useState(false);
  const [customName, setCustomName] = React.useState("");
  const [customPrice, setCustomPrice] = React.useState("");

  const allDisplayItems = React.useMemo(() => {
    const map = new Map<string, AdditionalItem>();
    items.forEach((it) => map.set(it.id, it));
    selected.forEach((sel) => {
      if (!map.has(sel.id)) {
        map.set(sel.id, {
          id: sel.id,
          name: sel.name,
          price: sel.price,
          description: "",
          category: "specialty",
          is_active: true,
        });
      }
    });
    return Array.from(map.values());
  }, [items, selected]);

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const name = customName.trim();
    const price = parseFloat(customPrice);
    if (!name || isNaN(price) || price <= 0 || !onAddCustom) return;
    onAddCustom({ name, price: Math.round(price * 100) / 100 });
    setCustomName("");
    setCustomPrice("");
    setShowCustom(false);
  };

  if (allDisplayItems.length === 0 && !onAddCustom) return null;

  return (
    <div className="space-y-2 pt-2 border-t border-slate-100">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 font-bold text-slate-800 uppercase tracking-wider text-[11px]">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Additional &amp; Specialty Items
          {disabled && <span className="text-amber-700 font-bold lowercase text-[10px]">(locked)</span>}
        </label>
        {onAddCustom && !disabled && (
          <button
            type="button"
            onClick={() => setShowCustom((prev) => !prev)}
            className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Tag className="h-3 w-3" />
            {showCustom ? "Cancel Custom" : "+ Custom Item"}
          </button>
        )}
      </div>

      {showCustom && !disabled && onAddCustom && (
        <form onSubmit={handleCreateCustom} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
          <input
            type="text"
            placeholder="Item name (e.g. Leather Jacket)"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-300 bg-white"
            required
          />
          <input
            type="number"
            step="0.5"
            min="1"
            placeholder="Price ($)"
            value={customPrice}
            onChange={(e) => setCustomPrice(e.target.value)}
            className="w-20 px-2 py-1 text-xs rounded-lg border border-slate-300 bg-white"
            required
          />
          <button
            type="submit"
            className="px-3 py-1 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-dark cursor-pointer shrink-0"
          >
            Add
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-0.5">
        {allDisplayItems.map((item) => {
          const qty = selected.find((i) => i.id === item.id)?.quantity || 0;
          return (
            <div
              key={item.id}
              className={cn(
                "p-2 rounded-xl border flex items-center justify-between transition",
                qty > 0 ? "border-primary/40 bg-pink-50/40" : "border-slate-200 bg-white",
                disabled && "opacity-75"
              )}
            >
              <div className="min-w-0 pr-2">
                <p className="font-bold text-slate-900 truncate text-[11px]">{item.name}</p>
                <p className="text-[10px] font-semibold text-primary">{formatCurrency(item.price)} each</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  disabled={disabled || qty === 0}
                  onClick={() => onUpdate(item, -1)}
                  className="h-6 w-6 rounded-lg border border-slate-300 bg-white flex items-center justify-center text-slate-600 disabled:opacity-30 cursor-pointer hover:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="font-black text-xs w-4 text-center">{qty}</span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onUpdate(item, 1)}
                  className="h-6 w-6 rounded-lg bg-primary text-white flex items-center justify-center cursor-pointer hover:bg-primary-dark disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


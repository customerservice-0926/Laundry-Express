"use client";

import * as React from "react";
import { Plus, Minus, Shirt, ChevronDown, ChevronUp, Check } from "lucide-react";
import { useAdditionalItems } from "@/hooks/use-additional-items";
import type { OrderAdditionalItemSelection } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface StepAdditionalItemsProps {
  selectedItems: OrderAdditionalItemSelection[];
  onItemsChange: (items: OrderAdditionalItemSelection[]) => void;
  initialItemName?: string;
}

export function StepAdditionalItems({
  selectedItems,
  onItemsChange,
  initialItemName,
}: StepAdditionalItemsProps) {
  const [isOpen, setIsOpen] = React.useState(Boolean(initialItemName || selectedItems.length > 0));
  const { items, isLoading } = useAdditionalItems();

  React.useEffect(() => {
    if (initialItemName && items.length > 0 && selectedItems.length === 0) {
      const match = items.find(
        (i) => i.name.toLowerCase() === initialItemName.toLowerCase() || i.id === initialItemName
      );
      if (match) {
        onItemsChange([{ id: match.id, name: match.name, price: match.price, quantity: 1 }]);
        setIsOpen(true);
      }
    }
  }, [initialItemName, items, selectedItems.length, onItemsChange]);

  const handleQuantityChange = (itemId: string, itemName: string, itemPrice: number, delta: number) => {
    const existing = selectedItems.find((i) => i.id === itemId);
    const currentQty = existing?.quantity || 0;
    const newQty = Math.max(0, currentQty + delta);

    if (newQty === 0) {
      onItemsChange(selectedItems.filter((i) => i.id !== itemId));
    } else if (existing) {
      onItemsChange(
        selectedItems.map((i) => (i.id === itemId ? { ...i, quantity: newQty } : i))
      );
    } else {
      onItemsChange([...selectedItems, { id: itemId, name: itemName, price: itemPrice, quantity: newQty }]);
    }
  };

  const totalAdditionalCost = selectedItems.reduce(
    (acc, it) => acc + it.price * it.quantity,
    0
  );
  const totalItemsCount = selectedItems.reduce((acc, it) => acc + it.quantity, 0);

  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white overflow-hidden transition-all shadow-2xs">
      {/* Interactive Toggle Header */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-pink-50 text-primary flex items-center justify-center shrink-0">
            <Shirt className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-900">
                Additional Items &amp; Specialty Wash
              </span>
              {totalItemsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                  {totalItemsCount} added (+{formatCurrency(totalAdditionalCost)})
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Football uniforms ($20), shoe cleaning ($15), bulky comforters &amp; specialty gear
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-primary hidden sm:inline">
            {isOpen ? "Hide Options" : "+ Add Items"}
          </span>
          <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </button>

      {/* Expanded Catalog Grid */}
      {isOpen && (
        <div className="p-4 pt-1 border-t border-slate-100 bg-slate-50/50 space-y-3">
          {isLoading ? (
            <div className="py-6 text-center text-xs text-slate-400">Loading custom clothing options...</div>
          ) : items.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-500">No additional items configured.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.map((item) => {
                const selected = selectedItems.find((i) => i.id === item.id);
                const qty = selected?.quantity || 0;
                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      qty > 0
                        ? "bg-pink-50/60 border-primary shadow-xs"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-xs text-slate-900 truncate">{item.name}</span>
                          {qty > 0 && <Check className="h-3 w-3 text-emerald-600 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                          {item.description || "Specialty wash and garment care"}
                        </p>
                      </div>
                      <span className="font-extrabold text-xs text-slate-900 shrink-0">
                        {formatCurrency(item.price)}
                      </span>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-medium">Quantity:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item.id, item.name, item.price, -1)}
                          disabled={qty <= 0}
                          className="h-7 w-7 rounded-lg border border-slate-200 bg-white text-slate-700 flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="font-black text-xs text-slate-900 w-5 text-center">{qty}</span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item.id, item.name, item.price, 1)}
                          className="h-7 w-7 rounded-lg border border-primary bg-primary text-white flex items-center justify-center hover:bg-primary-dark cursor-pointer shadow-2xs"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

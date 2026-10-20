"use client";

import * as React from "react";
import { Scale, ShoppingBag, Lock } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { useAdditionalItems } from "@/hooks/use-additional-items";
import { ManualOrderAddItems } from "./manual-order-add-items";
import type { Order, PricingMode, OrderAdditionalItemSelection, AdditionalItem } from "@/types";

interface OrderEditModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated: (updated: Order) => void;
}

export function OrderEditModal({ order, isOpen, onClose, onOrderUpdated }: OrderEditModalProps) {
  const [mode, setMode] = React.useState<PricingMode>("per_bag");
  const [bagCount, setBagCount] = React.useState(2);
  const [bagRate, setBagRate] = React.useState(25);
  const [weightLbs, setWeightLbs] = React.useState(15);
  const [poundRate, setPoundRate] = React.useState(1.75);
  const [selectedAddItems, setSelectedAddItems] = React.useState<OrderAdditionalItemSelection[]>([]);
  const [tipAmount, setTipAmount] = React.useState(0);
  const [notes, setNotes] = React.useState("");
  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const { items: availableItems } = useAdditionalItems(true);

  React.useEffect(() => {
    if (!order) return;
    setMode(order.pricing_mode === "package" ? "per_bag" : order.pricing_mode);
    setBagCount(order.bag_count || 1);
    setBagRate(order.bag_count ? Math.round((order.subtotal / order.bag_count) * 100) / 100 || 25 : 25);
    const wt = order.final_weight_lbs || order.estimated_weight_lbs || 15;
    setWeightLbs(wt);
    setPoundRate(wt ? Math.round((order.subtotal / wt) * 100) / 100 || 1.75 : 1.75);
    setSelectedAddItems(Array.isArray(order.additional_items) ? [...order.additional_items] : []);
    setTipAmount(order.tip_amount || 0);
    setNotes(order.customer_notes || "");
    setCustomerName(order.customer_name || "");
    setCustomerPhone(order.customer_phone || "");
    setError("");
  }, [order]);

  if (!order) return null;

  const isCompleted = order.order_status === "completed";
  const currentSubtotal = mode === "per_bag" ? Math.round(bagCount * bagRate * 100) / 100 : Math.round(weightLbs * poundRate * 100) / 100;
  const additionalItemsFee = selectedAddItems.reduce((acc, it) => acc + (it.price * it.quantity), 0) > 0
    ? Math.round(selectedAddItems.reduce((acc, it) => acc + (it.price * it.quantity), 0) * 100) / 100
    : Number(order.additional_items_fee || 0);

  const detergentFee = Number(order.detergent_fee || 0);
  const deliveryFee = Number(order.delivery_fee || 0);
  const discountAmount = Number(order.discount_amount || 0);
  const calculatedTotal = isCompleted
    ? Number(order.total_amount || 0)
    : Math.max(0, Math.round((currentSubtotal + detergentFee + additionalItemsFee + deliveryFee + tipAmount - discountAmount) * 100) / 100);

  const handleUpdateAddItem = (item: AdditionalItem, delta: number) => {
    if (isCompleted) return;
    setSelectedAddItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      const nextQty = Math.max(0, (existing?.quantity || 0) + delta);
      if (nextQty === 0) return prev.filter((i) => i.id !== item.id);
      if (existing) return prev.map((i) => (i.id === item.id ? { ...i, quantity: nextQty } : i));
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: nextQty }];
    });
  };

  const handleAddCustomItem = (custom: { name: string; price: number }) => {
    if (isCompleted) return;
    setSelectedAddItems((prev) => [...prev, { id: `custom-${Date.now()}`, name: custom.name, price: custom.price, quantity: 1 }]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      const payload = isCompleted
        ? { customer_name: customerName.trim() || undefined, customer_phone: customerPhone.trim() || undefined, customer_notes: notes.trim() }
        : {
            pricing_mode: mode,
            bag_count: mode === "per_bag" ? bagCount : 0,
            weight_lbs: mode === "per_lb" ? weightLbs : 0,
            bag_rate: bagRate, pound_rate: poundRate,
            additional_items: selectedAddItems, additional_items_fee: additionalItemsFee, tip_amount: tipAmount,
            customer_name: customerName.trim() || undefined, customer_phone: customerPhone.trim() || undefined, customer_notes: notes.trim(),
          };

      const res = await fetch(`/api/orders/${order.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update order.");
      onOrderUpdated(data.order);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save order changes.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose} title={`Edit Order: #${order.order_number}`} description="Modify order details, specialty items, notes, or contact info." className="max-w-xl max-h-[90vh] overflow-y-auto">
      <form onSubmit={handleSave} className="space-y-4 text-xs text-slate-700">
        {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">{error}</div>}

        {isCompleted && (
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-700 shrink-0" />
            <span>Completed Order — Billing metrics are locked to preserve Stripe sync. Contact details &amp; notes editable.</span>
          </div>
        )}

        {/* Pricing Mode Conversion Switch */}
        <div className="space-y-1.5">
          <label className="font-bold text-slate-800 uppercase text-[10px] tracking-wider flex items-center gap-1">
            Service Plan Type {isCompleted && <span className="text-amber-700 font-bold lowercase text-[10px]">(locked)</span>}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "per_bag" as const, label: "By the Bag (13-Gal)", icon: ShoppingBag },
              { id: "per_lb" as const, label: "By the Pound (lbs)", icon: Scale },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                disabled={isCompleted}
                onClick={() => setMode(id)}
                className={`p-2 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${
                  isCompleted ? "opacity-60 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-500" :
                  mode === id ? "bg-pink-50 border-primary text-primary ring-1 ring-primary cursor-pointer" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Quantity & Rates */}
        {mode === "per_bag" ? (
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Number of Bags</label>
              <input type="number" min="1" max="20" disabled={isCompleted} value={bagCount} onChange={(e) => setBagCount(parseInt(e.target.value, 10) || 1)} className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 bg-white disabled:bg-slate-100" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Rate per Bag ($)</label>
              <input type="number" step="0.50" min="5" disabled={isCompleted} value={bagRate} onChange={(e) => setBagRate(parseFloat(e.target.value) || 25)} className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 bg-white disabled:bg-slate-100" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Scale Weight (lbs)</label>
              <input type="number" step="0.1" min="1" disabled={isCompleted} value={weightLbs} onChange={(e) => setWeightLbs(parseFloat(e.target.value) || 15)} className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 bg-white disabled:bg-slate-100" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Rate per Lb ($)</label>
              <input type="number" step="0.05" min="0.5" disabled={isCompleted} value={poundRate} onChange={(e) => setPoundRate(parseFloat(e.target.value) || 1.75)} className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 bg-white disabled:bg-slate-100" />
            </div>
          </div>
        )}

        {/* Additional & Specialty Items Selection */}
        <ManualOrderAddItems
          items={availableItems}
          selected={selectedAddItems}
          onUpdate={handleUpdateAddItem}
          disabled={isCompleted}
          onAddCustom={handleAddCustomItem}
        />

        {/* Driver Tip & Specialty Items Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Driver Tip ($)</label>
            <input
              type="number"
              step="1"
              min="0"
              disabled={isCompleted}
              value={tipAmount}
              onChange={(e) => setTipAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-emerald-700 bg-white disabled:bg-slate-100"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Specialty Items Fee</label>
            <div className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>{selectedAddItems.reduce((a, b) => a + b.quantity, 0)} items</span>
              <span className="text-primary font-black">+{formatCurrency(additionalItemsFee)}</span>
            </div>
          </div>
        </div>

        {/* Customer Contact Information */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Customer Name</label>
            <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Customer Phone</label>
            <input type="text" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900" />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Admin / Special Notes</label>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900" placeholder="e.g. Added comforter per customer phone request" />
        </div>

        {/* Live Total Recalculation Bar */}
        <div className="p-3 rounded-xl bg-pink-50/50 border border-primary/20 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-500 block">
              {isCompleted ? "Original Settled Total (Paid)" : "Recalculated Total"}
            </span>
            <span className="text-xs text-slate-600">
              {isCompleted ? "Locked to preserve Stripe sync" : `Subtotal: ${formatCurrency(currentSubtotal)} · Items: +${formatCurrency(additionalItemsFee)}`}
            </span>
          </div>
          <span className="text-xl font-black text-slate-900 tracking-tight">{formatCurrency(calculatedTotal)}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button type="submit" variant="hero" size="sm" disabled={isSaving} className="font-bold">
            {isSaving ? "Saving Order..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}



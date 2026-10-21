"use client";

import * as React from "react";
import { Scale, ShoppingBag, Lock, CreditCard } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
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
  const [bagCount, setBagCount] = React.useState(2), [bagRate, setBagRate] = React.useState(25);
  const [weightLbs, setWeightLbs] = React.useState(15), [poundRate, setPoundRate] = React.useState(1.75);
  const [selectedAddItems, setSelectedAddItems] = React.useState<OrderAdditionalItemSelection[]>([]);
  const [notes, setNotes] = React.useState("");
  const [customerName, setCustomerName] = React.useState(""), [customerPhone, setCustomerPhone] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false), [error, setError] = React.useState("");
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
    setNotes(order.customer_notes || "");
    setCustomerName(order.customer_name || "");
    setCustomerPhone(order.customer_phone || "");
    setError("");
  }, [order]);

  if (!order) return null;

  const isCompleted = order.order_status === "completed";
  const isAlreadyPaid = order.payment_status === "paid";
  const isLocked = isCompleted || isAlreadyPaid;

  const tipAmount = Number(order.tip_amount || 0);
  const currentSubtotal = mode === "per_bag" ? Math.round(bagCount * bagRate * 100) / 100 : Math.round(weightLbs * poundRate * 100) / 100;
  const additionalItemsFee = selectedAddItems.reduce((acc, it) => acc + (it.price * it.quantity), 0) > 0
    ? Math.round(selectedAddItems.reduce((acc, it) => acc + (it.price * it.quantity), 0) * 100) / 100
    : Number(order.additional_items_fee || 0);

  const detergentFee = Number(order.detergent_fee || 0), deliveryFee = Number(order.delivery_fee || 0), discountAmount = Number(order.discount_amount || 0);
  const isUpfrontPaid = Boolean(
    order.delivery_fee_paid ||
    order.tip_paid ||
    order.payment_status === "paid" ||
    (order.payment_status === "authorized" && order.stripe_payment_intent)
  );
  const calculatedTotal = isLocked ? Number(order.total_amount || 0) : Math.max(0, Math.round((currentSubtotal + detergentFee + additionalItemsFee + deliveryFee + tipAmount - discountAmount) * 100) / 100);
  const unpaidDelivery = isUpfrontPaid ? 0 : deliveryFee;
  const unpaidTip = isUpfrontPaid ? 0 : tipAmount;
  const washBalance = Math.max(0, currentSubtotal + detergentFee + additionalItemsFee - discountAmount);
  const remainingBalance = Math.round((washBalance + unpaidDelivery + unpaidTip) * 100) / 100;
  const hasCardOnFile = Boolean(order.stripe_payment_method_id || (order.stripe_customer_id && (order.card_last4 || order.stripe_payment_method_id)));
  const amountToCharge = !isAlreadyPaid ? remainingBalance : 0;

  const handleUpdateAddItem = (item: AdditionalItem, delta: number) => {
    if (isLocked) return;
    setSelectedAddItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      const nextQty = Math.max(0, (existing?.quantity || 0) + delta);
      if (nextQty === 0) return prev.filter((i) => i.id !== item.id);
      return existing ? prev.map((i) => (i.id === item.id ? { ...i, quantity: nextQty } : i)) : [...prev, { id: item.id, name: item.name, price: item.price, quantity: nextQty }];
    });
  };

  const handleAddCustomItem = (custom: { name: string; price: number }) => {
    if (!isLocked) setSelectedAddItems((prev) => [...prev, { id: `custom-${Date.now()}`, name: custom.name, price: custom.price, quantity: 1 }]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      const payload = isLocked
        ? { customer_name: customerName.trim() || undefined, customer_phone: customerPhone.trim() || undefined, customer_notes: notes.trim() }
        : {
            pricing_mode: mode,
            bag_count: mode === "per_bag" ? bagCount : 0,
            weight_lbs: mode === "per_lb" ? weightLbs : 0,
            bag_rate: bagRate, pound_rate: poundRate,
            additional_items: selectedAddItems, additional_items_fee: additionalItemsFee,
            customer_name: customerName.trim() || undefined, customer_phone: customerPhone.trim() || undefined, customer_notes: notes.trim(),
          };

      const res = await fetch(`/api/orders/${order.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update order.");
      toast.success(data.message || (data.cardCharged ? `Charged ${formatCurrency(data.chargedAmount || amountToCharge)} to customer card!` : "Order updated."));
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

        {(isAlreadyPaid || isCompleted) && (
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-700 shrink-0" />
            <span>{isAlreadyPaid ? "Payment Settled — Charges already cut from customer card. Billing metrics cannot be altered again." : "Completed Order — Billing metrics are locked. Contact info and notes are editable."}</span>
          </div>
        )}

        {/* Pricing Mode Conversion Switch */}
        <div className="space-y-1.5">
          <label className="font-bold text-slate-800 uppercase text-[10px] tracking-wider flex items-center gap-1">
            Service Plan Type {isLocked && <span className="text-amber-700 font-bold lowercase text-[10px]">(locked)</span>}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "per_bag" as const, label: "By the Bag (13-Gal)", icon: ShoppingBag },
              { id: "per_lb" as const, label: "By the Pound (lbs)", icon: Scale },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id} type="button" disabled={isLocked} onClick={() => setMode(id)}
                className={`p-2 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${
                  isLocked ? "opacity-60 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-500" :
                  mode === id ? "bg-pink-50 border-primary text-primary ring-1 ring-primary cursor-pointer" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Quantity & Rates */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">{mode === "per_bag" ? "Number of Bags" : "Scale Weight (lbs)"}</label>
            <input type="number" step={mode === "per_bag" ? "1" : "0.1"} min="1" disabled={isLocked} value={mode === "per_bag" ? bagCount : weightLbs} onChange={(e) => mode === "per_bag" ? setBagCount(parseInt(e.target.value, 10) || 1) : setWeightLbs(parseFloat(e.target.value) || 15)} className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 bg-white disabled:bg-slate-100" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">{mode === "per_bag" ? "Rate per Bag ($)" : "Rate per Lb ($)"}</label>
            <input type="number" step={mode === "per_bag" ? "1" : "0.05"} min={mode === "per_bag" ? "5" : "0.5"} disabled={isLocked} value={mode === "per_bag" ? bagRate : poundRate} onChange={(e) => mode === "per_bag" ? setBagRate(parseFloat(e.target.value) || 25) : setPoundRate(parseFloat(e.target.value) || 1.75)} className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 bg-white disabled:bg-slate-100" />
          </div>
        </div>

        {/* Additional & Specialty Items Selection */}
        <ManualOrderAddItems items={availableItems} selected={selectedAddItems} onUpdate={handleUpdateAddItem} disabled={isLocked} onAddCustom={handleAddCustomItem} />

        {/* Read-Only Driver Tip Mention & Specialty Items Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Driver Tip (Gratuity)</label>
            <div className="px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 text-xs font-bold text-emerald-900 flex items-center justify-between">
              <span className="text-[10px] text-emerald-800">{isUpfrontPaid ? "✓ Paid at Booking" : "Customer Tip"}</span>
              <span className="text-emerald-700 font-black">+{formatCurrency(tipAmount)}</span>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Specialty Items Fee</label>
            <div className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>{selectedAddItems.reduce((a, b) => a + b.quantity, 0)} items</span>
              <span className="text-primary font-black">+{formatCurrency(additionalItemsFee)}</span>
            </div>
          </div>
        </div>

        {/* Customer Contact & Notes */}
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
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Admin / Special Notes</label>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900" placeholder="e.g. Added comforter per customer phone request" />
        </div>

        {/* Live Total Recalculation Bar */}
        <div className="p-3 rounded-xl bg-pink-50/50 border border-primary/20 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-500 block">
              {isLocked ? "Settled Total" : isUpfrontPaid ? "Wash & Items Balance to Charge" : "Recalculated Total"}
            </span>
            <span className="text-xs text-slate-600">
              {isLocked ? "Charges settled — Contact details editable" : `Subtotal: ${formatCurrency(currentSubtotal)} · Items: +${formatCurrency(additionalItemsFee)}`}
            </span>
          </div>
          <div className="text-right">
            <span className="text-xl font-black text-slate-900 tracking-tight">
              {formatCurrency(isUpfrontPaid ? remainingBalance : calculatedTotal)}
            </span>
            {isUpfrontPaid && <span className="text-[10px] text-emerald-700 font-bold block">(Excludes $20.00 delivery &amp; tip paid upfront)</span>}
          </div>
        </div>

        {/* Card on file status and Stripe cut preview */}
        {hasCardOnFile && amountToCharge > 0 ? (
          <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-extrabold block">Card on File: {(order.card_brand || "Card").toUpperCase()} •••• {order.card_last4 || "Stored"}</span>
                <span className="text-[11px] text-emerald-700">Net wash balance of {formatCurrency(amountToCharge)} will be charged via Stripe{isUpfrontPaid ? " (Delivery & Tip settled upfront)" : ""}</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs">+{formatCurrency(amountToCharge)}</span>
          </div>
        ) : !hasCardOnFile && calculatedTotal > 0 && !isAlreadyPaid ? (
          <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span>No card on file for this customer yet.</span>
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button type="submit" variant="hero" size="sm" disabled={isSaving} className="font-bold">
            {isSaving ? "Saving..." : isLocked ? "Save Details" : hasCardOnFile && amountToCharge > 0 ? `Save & Charge ${formatCurrency(amountToCharge)}` : "Save Changes"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

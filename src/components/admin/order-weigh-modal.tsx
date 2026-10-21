"use client";

import * as React from "react";
import { Scale, CreditCard, AlertCircle, CheckCircle2, Loader2, PackageCheck } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { Order, OrderAdditionalItemSelection } from "@/types";

interface OrderWeighModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedOrder: Order) => void;
}

export function OrderWeighModal({ order, isOpen, onClose, onSuccess }: OrderWeighModalProps) {
  const [scaleWeight, setScaleWeight] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState("");
  const [successMsg, setSuccessMsg] = React.useState("");
  const [poundRate, setPoundRate] = React.useState<number>(1.5);

  React.useEffect(() => {
    if (order) {
      setScaleWeight(String(order.final_weight_lbs || order.estimated_weight_lbs || ""));
      setErrorMsg(""); setSuccessMsg("");
    }
  }, [order]);

  React.useEffect(() => {
    fetch("/api/pricing").then((r) => r.json()).then((d) => {
      if (d?.pricing?.pound_price) setPoundRate(Number(d.pricing.pound_price));
    }).catch(() => {});
  }, []);

  const additionalItems: OrderAdditionalItemSelection[] = React.useMemo(() => {
    if (!order?.additional_items) return [];
    if (Array.isArray(order.additional_items)) return order.additional_items;
    if (typeof order.additional_items === "string") {
      try {
        const parsed = JSON.parse(order.additional_items);
        return Array.isArray(parsed) ? parsed : [];
      } catch { return []; }
    }
    return [];
  }, [order?.additional_items]);

  if (!order) return null;

  const weightNum = parseFloat(scaleWeight) || 0;
  const subtotal = Math.round(weightNum * poundRate * 100) / 100;
  const detergentFee = Number(order.detergent_fee || 0);
  const additionalItemsFee = Number(order.additional_items_fee || 0);
  const discount = Number(order.discount_amount || 0);
  const liveTotal = Math.max(0, subtotal + detergentFee + additionalItemsFee - discount);

  const hasCard = Boolean(order.stripe_payment_method_id || order.card_last4);
  const cardLabel = order.card_last4
    ? `${(order.card_brand || "Card").toUpperCase()} •••• ${order.card_last4}`
    : order.stripe_payment_method_id ? "Verified Card on File" : "Manual / Cash Settle";

  const handleCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (weightNum <= 0) {
      setErrorMsg("Please enter a valid scale weight greater than 0 lbs.");
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(""); setSuccessMsg("");
    try {
      const response = await fetch("/api/orders/charge-weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, finalWeightLbs: weightNum, customPoundRate: poundRate > 0 ? poundRate : undefined }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to process card charge.");
      setSuccessMsg(data.message || `Set final weight to ${weightNum} lbs (${formatCurrency(liveTotal)}). Moved to In Wash.`);
      if (data.order) onSuccess(data.order);
      setTimeout(() => onClose(), 1500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Unable to process charge.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={onClose}
      title={`Pickup & Weigh Order #${order.order_number}`}
      description="Enter scale weight, verify rate, and realize charge on customer's card upon pickup."
      className="max-w-md"
    >
      <form onSubmit={handleCharge} className="space-y-4 text-xs text-slate-700">
        {/* Customer & Card Overview */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div>
            <span className="font-extrabold text-slate-900 block">{order.customer_name || "Customer"}</span>
            <span className="text-[11px] text-slate-500">{order.customer_phone || order.customer_email}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
            <CreditCard className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>{cardLabel}</span>
          </div>
        </div>

        {/* Additional / Specialty Items Alert */}
        {(additionalItems.length > 0 || additionalItemsFee > 0) && (
          <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200/80 text-[11px]">
            <div className="font-bold text-purple-900 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <PackageCheck className="h-3.5 w-3.5 text-purple-700" />
                Specialty Items to Collect
              </span>
              <span className="font-extrabold text-purple-700">+{formatCurrency(additionalItemsFee)}</span>
            </div>
            {additionalItems.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {additionalItems.map((item, idx) => (
                  <span key={item.id || idx} className="px-2 py-0.5 rounded-md bg-white border border-purple-200 font-semibold text-purple-800 text-[10px]">
                    {item.name} ×{item.quantity} ({formatCurrency(item.price * item.quantity)})
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Weight & Rate Customization Grid */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border border-slate-200 bg-white">
          <div>
            <label htmlFor="scale-weight-input" className="block text-[11px] font-bold text-slate-800 mb-1">Scale Weight (lbs)</label>
            <div className="relative">
              <Scale className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                id="scale-weight-input" type="number" step="0.1" min="0.5" max="300" required
                value={scaleWeight} onChange={(e) => setScaleWeight(e.target.value)} placeholder="15.0"
                className="w-full pl-8 pr-2 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Est: {order.estimated_weight_lbs || 15} lbs</span>
          </div>
          <div>
            <label htmlFor="custom-rate-input" className="block text-[11px] font-bold text-slate-800 mb-1">Custom Rate ($/lb)</label>
            <input
              id="custom-rate-input" type="number" step="0.05" min="0.1" max="50" required
              value={poundRate} onChange={(e) => setPoundRate(parseFloat(e.target.value) || 0)}
              className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Base: {formatCurrency(poundRate)}/lb</span>
          </div>
        </div>

        {/* Live Charge Breakdown */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>Wash Subtotal ({weightNum} lbs × {formatCurrency(poundRate)}):</span>
            <span className="font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
          </div>
          {detergentFee > 0 && (
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Detergent ({order.detergent_name || "Premium"}):</span>
              <span className="font-semibold text-slate-800">+{formatCurrency(detergentFee)}</span>
            </div>
          )}
          {additionalItems.length > 0 ? (
            additionalItems.map((item, idx) => (
              <div key={item.id || idx} className="flex justify-between text-[11px] text-slate-500">
                <span className="truncate pr-2">{item.name} ({item.quantity}x @ {formatCurrency(item.price)}):</span>
                <span className="font-semibold text-slate-800 shrink-0">+{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))
          ) : additionalItemsFee > 0 ? (
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Specialty Items:</span>
              <span className="font-semibold text-slate-800">+{formatCurrency(additionalItemsFee)}</span>
            </div>
          ) : null}
          <div className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-100 flex items-center justify-between">
            <span>Doorstep delivery &amp; driver tip:</span>
            <span className="font-semibold text-emerald-600">Paid at Order Confirmation</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-[11px] text-emerald-600 font-semibold">
              <span>Coupon Discount:</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-black text-sm text-slate-900">
            <span>Total To Charge Card:</span>
            <span className="text-primary text-base">{formatCurrency(liveTotal)}</span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" variant="hero" size="sm" disabled={isSubmitting || weightNum <= 0} className="cursor-pointer">
            {isSubmitting ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />{hasCard ? "Charging Card..." : "Saving..."}</>
            ) : (
              <><Scale className="h-3.5 w-3.5 mr-1.5" />{hasCard ? `Confirm & Charge ${formatCurrency(liveTotal)}` : `Set Final Price (${formatCurrency(liveTotal)})`}</>
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

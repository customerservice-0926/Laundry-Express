"use client";

import * as React from "react";
import { DollarSign, CreditCard, Mail, Sparkles, Truck, Heart } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import type { ManualOrderFormState, ManualOrderFieldChange } from "./manual-order-types";

interface Step3Props {
  form: ManualOrderFormState;
  onChange: ManualOrderFieldChange;
  subtotal: number;
  deliveryFee: number;
  detergentFee: number;
  additionalItemsFee?: number;
  distanceMiles?: number;
  totalAmount: number;
}

export function ManualOrderStep3({
  form,
  onChange,
  subtotal,
  deliveryFee,
  detergentFee,
  additionalItemsFee = 0,
  distanceMiles = 0,
  totalAmount,
}: Step3Props) {
  const isFreeDelivery = deliveryFee === 0;

  return (
    <div className="space-y-4 py-1 text-xs">
      {/* Payment Method Selector (Card or Cash - Bank removed) */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
          Payment Method <span className="text-slate-400 font-normal">(Card via Stripe or Cash)</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onChange("payment_method", "card")}
            className={cn(
              "p-3 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1",
              form.payment_method === "card"
                ? "border-primary bg-pink-50/70 ring-2 ring-primary/20 text-slate-900"
                : "border-slate-200 bg-white hover:border-slate-300 text-slate-600"
            )}
          >
            <CreditCard className={cn("h-5 w-5", form.payment_method === "card" ? "text-primary" : "text-slate-400")} />
            <span className="font-bold">Card (Stripe)</span>
            <span className="text-[10px] text-slate-400">Card on file or invoice link</span>
          </button>

          <button
            type="button"
            onClick={() => onChange("payment_method", "cash")}
            className={cn(
              "p-3 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1",
              form.payment_method === "cash"
                ? "border-primary bg-pink-50/70 ring-2 ring-primary/20 text-slate-900"
                : "border-slate-200 bg-white hover:border-slate-300 text-slate-600"
            )}
          >
            <DollarSign className={cn("h-5 w-5", form.payment_method === "cash" ? "text-primary" : "text-slate-400")} />
            <span className="font-bold">Cash</span>
            <span className="text-[10px] text-slate-400">Collect on pickup/delivery</span>
          </button>
        </div>
      </div>

      {/* Payment Status & Order Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Payment Status</label>
          <select
            value={form.payment_status}
            onChange={(e) => {
              const nextPayment = e.target.value as "paid" | "pending";
              onChange("payment_status", nextPayment);
              if (nextPayment === "paid" && form.order_status === "pending") {
                onChange("order_status", "confirmed");
              } else if (nextPayment === "pending" && form.order_status === "completed") {
                onChange("order_status", "confirmed");
              }
            }}
            className="w-full h-9 px-3 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <option value="pending">
              {form.payment_method === "cash" ? "Pending (Collect Cash on Delivery/Pickup)" : "Pending (Send Checkout Link / Collect Card)"}
            </option>
            <option value="paid">Paid (Payment Received)</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
            Order Status <span className="text-slate-400 font-normal">(Admin Record)</span>
          </label>
          <select
            value={form.order_status}
            onChange={(e) => onChange("order_status", e.target.value as "pending" | "confirmed" | "completed")}
            className="w-full h-9 px-3 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            {form.payment_status !== "paid" && (
              <option value="pending">
                {form.payment_method === "cash" ? "Pending (Awaiting Pickup & Cash Payment)" : "Pending (Awaiting Card & Confirmation)"}
              </option>
            )}
            <option value="confirmed">Confirmed (Scheduled for Pickup)</option>
            {form.payment_status === "paid" && (
              <option value="completed">Completed (Finished &amp; Delivered)</option>
            )}
          </select>
          {form.payment_status === "paid" ? (
            <p className="text-[10px] text-emerald-600 mt-1 font-medium">Payment received: Order is confirmed or completed.</p>
          ) : (
            <p className="text-[10px] text-amber-600 mt-1 font-medium">Payment pending: Order cannot be marked completed.</p>
          )}
        </div>
      </div>

      {/* Email Invoice Dispatch Option */}
      {form.customer_email && (
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-700">
            <Mail className="h-4 w-4 text-primary shrink-0" />
            <span>
              {form.payment_method === "cash"
                ? <>Send order confirmation invoice to <strong>{form.customer_email}</strong></>
                : <>Send invoice &amp; card setup link to <strong>{form.customer_email}</strong></>}
            </span>
          </div>
          <input
            type="checkbox"
            checked={form.send_email_copy}
            onChange={(e) => onChange("send_email_copy", e.target.checked)}
            className="h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer"
          />
        </div>
      )}

      {/* Customer Gratuity Notice */}
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-emerald-600 fill-emerald-600 shrink-0" />
          <span className="font-semibold text-slate-700">Driver &amp; Team Tip</span>
        </div>
        <span className="text-[11px] font-medium text-slate-500">
          {form.payment_method === "cash" ? "Cash tip given directly to driver" : "Selected by customer on payment link"}
        </span>
      </div>

      {/* Itemized Price Summary Box */}
      <div className="p-4 rounded-2xl bg-linear-to-br from-pink-50/60 to-rose-50/40 border border-pink-200/80 space-y-2">
        <div className="flex justify-between text-slate-600 font-medium">
          <span>
            {form.pricing_mode === "package" ? `Package (${form.package_name || "Bundle"})` : "Wash Subtotal"}:
          </span>
          <span className="font-bold text-slate-900">{formatCurrency(subtotal)}</span>
        </div>

        {detergentFee > 0 && (
          <div className="flex justify-between text-slate-600 font-medium">
            <span>Detergent Add-on:</span>
            <span className="font-bold text-slate-900">+{formatCurrency(detergentFee)}</span>
          </div>
        )}

        {additionalItemsFee > 0 && (
          <div className="flex justify-between text-slate-600 font-medium">
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-primary" /> Additional Items ({form.additional_items.reduce((a, b) => a + b.quantity, 0)}):
            </span>
            <span className="font-bold text-slate-900">+{formatCurrency(additionalItemsFee)}</span>
          </div>
        )}

        <div className="flex justify-between text-slate-600 font-medium items-center">
          <span className="flex items-center gap-1">
            <Truck className="h-3 w-3 text-primary" />
            Delivery Fee ({isFreeDelivery ? "FREE" : "Standard"}):
          </span>
          <span className={cn("font-bold", isFreeDelivery ? "text-emerald-700" : "text-slate-900")}>
            {isFreeDelivery ? "FREE ($0.00)" : `+${formatCurrency(deliveryFee)}`}
          </span>
        </div>

        {(form.tip_amount || 0) > 0 && (
          <div className="flex justify-between text-slate-600 font-medium items-center">
            <span className="flex items-center gap-1 text-emerald-700">
              <Heart className="h-3 w-3 text-emerald-600 fill-emerald-600" /> Driver &amp; Crew Tip:
            </span>
            <span className="font-bold text-emerald-700">+{formatCurrency(form.tip_amount)}</span>
          </div>
        )}

        <div className="pt-2 border-t border-pink-200 flex justify-between items-center text-sm font-black text-slate-900">
          <span>Total Order Value:</span>
          <span className="text-base text-primary font-black">{formatCurrency(totalAmount)}</span>
        </div>
      </div>
    </div>
  );
}

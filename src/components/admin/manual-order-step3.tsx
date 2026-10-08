"use client";

import * as React from "react";
import { DollarSign, CreditCard, Landmark, Mail } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { ManualOrderFormState, ManualOrderFieldChange } from "./manual-order-types";

interface Step3Props {
  form: ManualOrderFormState;
  onChange: ManualOrderFieldChange;
  subtotal: number;
  deliveryFee: number;
  detergentFee: number;
  totalAmount: number;
}

export function ManualOrderStep3({
  form,
  onChange,
  subtotal,
  deliveryFee,
  detergentFee,
  totalAmount,
}: Step3Props) {
  return (
    <div className="space-y-4 py-1">
      {/* Payment Method Selector (Cash, Card, Bank ONLY) */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
          Payment Method <span className="text-slate-400 font-normal">(Cash, Card, or Bank)</span>
        </label>
        <div className="grid grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => onChange("payment_method", "cash")}
            className={`p-3 rounded-2xl border text-center transition cursor-pointer ${
              form.payment_method === "cash"
                ? "border-primary bg-pink-50/70 ring-2 ring-primary/20 text-slate-900"
                : "border-slate-200 bg-white hover:border-slate-300 text-slate-600"
            }`}
          >
            <DollarSign className={`h-5 w-5 mx-auto mb-1 ${form.payment_method === "cash" ? "text-primary" : "text-slate-400"}`} />
            <span className="text-xs font-bold block">Cash</span>
          </button>

          <button
            type="button"
            onClick={() => onChange("payment_method", "card")}
            className={`p-3 rounded-2xl border text-center transition cursor-pointer ${
              form.payment_method === "card"
                ? "border-primary bg-pink-50/70 ring-2 ring-primary/20 text-slate-900"
                : "border-slate-200 bg-white hover:border-slate-300 text-slate-600"
            }`}
          >
            <CreditCard className={`h-5 w-5 mx-auto mb-1 ${form.payment_method === "card" ? "text-primary" : "text-slate-400"}`} />
            <span className="text-xs font-bold block">Card</span>
          </button>

          <button
            type="button"
            onClick={() => onChange("payment_method", "bank")}
            className={`p-3 rounded-2xl border text-center transition cursor-pointer ${
              form.payment_method === "bank"
                ? "border-primary bg-pink-50/70 ring-2 ring-primary/20 text-slate-900"
                : "border-slate-200 bg-white hover:border-slate-300 text-slate-600"
            }`}
          >
            <Landmark className={`h-5 w-5 mx-auto mb-1 ${form.payment_method === "bank" ? "text-primary" : "text-slate-400"}`} />
            <span className="text-xs font-bold block">Bank</span>
          </button>
        </div>
      </div>

      {/* Payment Status & Order Status (Confirmed or Completed ONLY) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Status</label>
          <select
            value={form.payment_status}
            onChange={(e) => onChange("payment_status", e.target.value as "paid" | "pending")}
            className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <option value="paid">Paid (Payment Received)</option>
            <option value="pending">Pending (Collect on Delivery)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Order Status <span className="text-slate-400 font-normal">(Admin Record)</span>
          </label>
          <select
            value={form.order_status}
            onChange={(e) => onChange("order_status", e.target.value as "confirmed" | "completed")}
            className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <option value="confirmed">Confirmed (Scheduled for Pickup)</option>
            <option value="completed">Completed (Already Finished &amp; Delivered)</option>
          </select>
        </div>
      </div>

      {/* Email Invoice Dispatch Option */}
      {form.customer_email && (
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <Mail className="h-4 w-4 text-primary shrink-0" />
            <span>Send copy of invoice to <strong>{form.customer_email}</strong></span>
          </div>
          <input
            type="checkbox"
            checked={form.send_email_copy}
            onChange={(e) => onChange("send_email_copy", e.target.checked)}
            className="h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer"
          />
        </div>
      )}

      {/* Itemized Price Summary Box */}
      <div className="p-4 rounded-2xl bg-linear-to-br from-pink-50/60 to-rose-50/40 border border-pink-200/80 space-y-2 text-xs">
        <div className="flex justify-between text-slate-600 font-medium">
          <span>Wash Subtotal:</span>
          <span className="font-bold text-slate-900">{formatCurrency(subtotal)}</span>
        </div>
        {detergentFee > 0 && (
          <div className="flex justify-between text-slate-600 font-medium">
            <span>Detergent Add-on:</span>
            <span className="font-bold text-slate-900">+{formatCurrency(detergentFee)}</span>
          </div>
        )}
        <div className="flex justify-between text-slate-600 font-medium">
          <span>Delivery Fee:</span>
          <span className="font-bold text-slate-900">{deliveryFee === 0 ? "FREE" : formatCurrency(deliveryFee)}</span>
        </div>
        <div className="pt-2 border-t border-pink-200 flex justify-between items-center text-sm font-black text-slate-900">
          <span>Total Order Value:</span>
          <span className="text-base text-primary font-black">{formatCurrency(totalAmount)}</span>
        </div>
      </div>
    </div>
  );
}

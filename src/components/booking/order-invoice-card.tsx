"use client";

import * as React from "react";
import Image from "next/image";
import { MapPin, ShieldCheck, CheckCircle2 } from "lucide-react";
import type { UnifiedInvoiceInput } from "@/lib/invoice/invoice-html-template";
import { formatCurrency, formatPhone, resolveDetergentName } from "@/lib/utils";
import { APP_CONFIG } from "@/lib/constants";

interface OrderInvoiceCardProps {
  invoice: UnifiedInvoiceInput;
  className?: string;
}

function InvoiceRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500 font-semibold shrink-0">{label}</span>
      <span className={`text-xs text-slate-900 font-bold text-right ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

export function OrderInvoiceCard({ invoice, className = "" }: OrderInvoiceCardProps) {
  const methodLabel: Record<string, string> = {
    card: "Credit / Debit Card (Stripe)",
    apple_pay: "Apple Pay (Stripe)",
    google_pay: "Google Pay (Stripe)",
    stripe: "Stripe 256-bit Secure Checkout",
  };

  const paymentKey = (invoice.paymentMethod || "card").toLowerCase();
  const paymentDisplay = methodLabel[paymentKey] || invoice.paymentMethod || "Credit / Debit Card (Stripe)";

  const rawDetergent = invoice.orderDetails?.detergent || invoice.detergent || "Hypoallergenic Eco-Wash";
  const detergentName = resolveDetergentName(rawDetergent);
  const detergentFee = Number(invoice.detergentFee || 0);

  const planName = invoice.orderDetails?.planName || invoice.planName || "Wash & Fold Service";
  const quantity = invoice.orderDetails?.quantity || invoice.quantity || "1 Order";
  const specialRequest = invoice.orderDetails?.specialRequest || invoice.specialRequest || "Contactless Delivery";

  const subtotal = invoice.subtotal !== undefined ? Number(invoice.subtotal) : Number(invoice.totalAmount);
  const deliveryFee = Number(invoice.deliveryFee || 0);
  const discountAmount = Number(invoice.discountAmount || 0);
  const totalAmount = Number(invoice.totalAmount || 0);

  const orderId = invoice.orderId || invoice.orderNumber || "LX-ORDER";
  const txId = invoice.transactionId || `STRIPE-TX-${orderId.replace(/[^A-Za-z0-9]/g, "").slice(-8).toUpperCase()}`;

  return (
    <div
      id="official-invoice-print-area"
      className={`rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm text-left ${className}`}
    >
      {/* Top Accent Gradient Bar */}
      <div className="h-1.5 bg-gradient-to-r from-pink-600 to-rose-500" />

      {/* Brand Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-5 bg-gradient-to-b from-slate-50 to-white border-b border-slate-200">
        <div className="flex items-center gap-3.5">
          <div className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-2xl overflow-hidden shrink-0 border border-slate-200 bg-white p-1 shadow-xs flex items-center justify-center">
            <Image
              src="/brand/logo-badge.jpg"
              alt="Laundry Express"
              width={64}
              height={64}
              className="object-contain rounded-xl"
              priority
            />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-lg sm:text-xl tracking-tight leading-none">
              LAUNDRY <span className="text-primary">EXPRESS</span>
            </h3>
            <p className="text-xs font-bold text-primary mt-1 tracking-wide uppercase">
              Premium 24-Hour Wash &amp; Fold
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">{APP_CONFIG.supportPhone}</p>
          </div>
        </div>

        <div className="sm:text-right flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-black px-3.5 py-1.5 rounded-full border ${
              invoice.orderCancelled
                ? "text-orange-700 bg-orange-50 border-orange-200"
                : "text-emerald-700 bg-emerald-50 border-emerald-200"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            {invoice.orderCancelled ? "PAID — ORDER CANCELLED" : "PAID & CONFIRMED"}
          </span>
          <p className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">
            {invoice.orderCancelled ? "CANCELLATION INVOICE" : "TAX INVOICE"} &bull; {orderId}
          </p>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Customer & Schedule Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Billed To Customer</p>
            <p className="text-sm font-black text-slate-900">{invoice.customerName || "Valued Customer"}</p>
            {invoice.customerEmail && <p className="text-xs text-slate-600 font-medium">{invoice.customerEmail}</p>}
            {invoice.customerPhone && (
              <p className="text-xs text-slate-600 font-medium">Tel: {formatPhone(invoice.customerPhone)}</p>
            )}
            {invoice.address && (
              <p className="text-xs text-slate-600 flex items-start gap-1 mt-1 font-medium leading-relaxed">
                <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-rose-500" />
                {invoice.address}
              </p>
            )}
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Schedule &amp; Reference</p>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Order Number:</span>
                <span className="font-mono font-black text-slate-900">{orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Order Placed:</span>
                <span className="font-bold text-slate-800">{invoice.orderDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Pickup Window:</span>
                <span className="font-bold text-slate-800">
                  {invoice.pickupDate} ({invoice.pickupSlot})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Estimated Return:</span>
                <span className="font-bold text-emerald-700">{invoice.deliveryDate} (24hr Return)</span>
              </div>
              {txId && (
                <div className="flex justify-between pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500 font-medium">Stripe Tx ID:</span>
                  <span className="font-mono text-[10px] font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded select-all truncate max-w-[190px]">
                    {txId}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Itemized Service Breakdown */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Service Breakdown</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Amount</span>
          </div>
          <div className="px-4 divide-y divide-slate-100">
            <InvoiceRow label="Selected Plan" value={<span className="text-slate-900 font-black">{planName}</span>} />
            <InvoiceRow label="Order Intake Quantity" value={quantity} />
            <InvoiceRow
              label="Formula & Care"
              value={`${detergentName} • Cold Water Care (${detergentFee === 0 ? "Included Free" : formatCurrency(detergentFee)})`}
            />
            <InvoiceRow label="Doorstep Protocol" value={specialRequest} />
          </div>
        </div>

        {/* Financial Summary */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Financial Settlement</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Payment Summary</span>
          </div>
          <div className="px-4 divide-y divide-slate-100">
            <InvoiceRow label="Service Subtotal" value={formatCurrency(subtotal)} />
            <InvoiceRow
              label="Detergent Formulation Fee"
              value={
                detergentFee === 0 ? (
                  <span className="text-emerald-600 font-black">FREE (Included)</span>
                ) : (
                  formatCurrency(detergentFee)
                )
              }
            />
            <InvoiceRow
              label="Doorstep Logistics (Pickup & Return)"
              value={
                deliveryFee === 0 ? (
                  <span className="text-emerald-600 font-black">FREE ($0.00)</span>
                ) : (
                  formatCurrency(deliveryFee)
                )
              }
            />
            {discountAmount > 0 && (
              <InvoiceRow
                label="Promotional Discount"
                value={<span className="text-emerald-600 font-black">-{formatCurrency(discountAmount)}</span>}
              />
            )}
            <InvoiceRow label="Payment Method" value={paymentDisplay} />
            <InvoiceRow
              label="Stripe Transaction ID"
              value={
                <span className="font-mono text-[10px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-bold select-all">
                  {txId}
                </span>
              }
            />
            <div className="flex items-center justify-between py-3.5 bg-pink-50/50 px-3 -mx-3 rounded-b-xl border-t border-slate-100">
              <div>
                <span className="text-xs font-black text-slate-900 block">Total Cleared &amp; Authorized</span>
                <span className="text-[10px] text-slate-400">Captured securely via Stripe TLS 1.3 gateway</span>
              </div>
              <span className="text-2xl font-black text-primary tracking-tight">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Satisfaction Guarantee Banner */}
        <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-2.5">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-emerald-900 leading-relaxed">
            <strong className="font-bold">100% Satisfaction Guarantee:</strong> Washed individually in eco-conscious cold water, dried gently, folded with care, and sealed in weatherproof packaging for protected doorstep delivery.
          </p>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 text-center space-y-1">
          <p className="text-xs text-slate-500">
            Questions? Contact support at <strong>{APP_CONFIG.supportPhone}</strong> or email <strong>{APP_CONFIG.supportEmail}</strong>
          </p>
          <p className="text-[10px] text-slate-400">
            {invoice.orderCancelled ? "Official Order Cancellation Receipt & Settlement" : "Official Computer-Generated Tax Invoice"} &bull; Laundry Express &bull; laundryexpressservices.com
          </p>
        </div>
      </div>
    </div>
  );
}

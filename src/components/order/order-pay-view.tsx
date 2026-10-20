"use client";

import * as React from "react";
import Link from "next/link";
import { ShieldCheck, Lock, CheckCircle2, ArrowRight, Loader2, Sparkles, MapPin, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepTipSelector } from "@/components/booking/step-tip-selector";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Order } from "@/types";

interface OrderPayViewProps {
  order: Order;
}

export function OrderPayView({ order }: OrderPayViewProps) {
  const [tipAmount, setTipAmount] = React.useState<number>(order.tip_amount || 0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");

  const isPaid = order.payment_status === "paid";
  const baseAmount = Math.max(
    0,
    Math.round(
      (order.subtotal +
        (order.detergent_fee || 0) +
        (order.additional_items_fee || 0) +
        (order.delivery_fee || 0) -
        (order.discount_amount || 0)) *
        100
    ) / 100
  );
  const totalWithTip = Math.max(0, Math.round((baseAmount + tipAmount) * 100) / 100);

  const handlePay = async () => {
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const res = await fetch(`/api/orders/${order.order_number}/pay-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipAmount }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to start payment checkout.");
      }
      if (data.alreadyPaid) {
        window.location.href = `/order/success?order_id=${order.order_number}`;
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned from payment server.");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to open payment gateway.");
      setIsSubmitting(false);
    }
  };

  if (isPaid) {
    return (
      <div className="max-w-lg mx-auto p-6 my-12 bg-white rounded-3xl border border-slate-200/80 shadow-xs text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-black text-slate-900">Order Already Paid &amp; Confirmed</h2>
        <p className="text-xs text-slate-600">
          Order <strong>#{order.order_number}</strong> has already been settled and scheduled for pickup.
        </p>
        <div className="pt-2">
          <Link href={`/order/success?order_id=${order.order_number}`}>
            <Button variant="hero" size="sm" className="w-full">
              <span>View Order Receipt &amp; Invoice</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="text-center space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Laundry Express Secure Checkout</span>
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Complete Your Order Payment
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          Review your order details, select your driver tip, and add your card securely.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Order Specs Card */}
      <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Order Identifier</span>
            <span className="text-base font-black text-slate-900 font-mono">#{order.order_number}</span>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            Payment Pending
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
              <Calendar className="h-3 w-3 text-primary" /> Pickup &amp; Delivery
            </span>
            <div className="font-bold text-slate-900">Pickup: {order.pickup_date} ({order.pickup_slot})</div>
            {order.delivery_date && <div className="text-slate-600">Delivery: {order.delivery_date}</div>}
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-rose-500" /> Doorstep Address
            </span>
            <div className="font-bold text-slate-900">{order.customer_name}</div>
            <div className="truncate text-slate-600">{order.pickup_address || `${order.street_address}, ${order.city}`}</div>
          </div>
        </div>

        {/* Plan & Add-ons Summary */}
        <div className="pt-2 border-t border-slate-100 text-xs space-y-2">
          <div className="flex justify-between items-center text-slate-700">
            <span className="font-semibold">
              {order.pricing_mode === "package" ? "Saver Package Bundle" : order.pricing_mode === "per_lb" ? "By the Pound (Weighed Intake)" : `${order.bag_count || 1} Standard 13-Gal Bag(s)`}
            </span>
            <span className="font-bold text-slate-900">{formatCurrency(order.subtotal)}</span>
          </div>

          {order.additional_items && order.additional_items.length > 0 && (
            <div className="flex justify-between items-center text-slate-600">
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-primary" />
                Specialty Items ({order.additional_items.map((it) => `${it.name} x${it.quantity}`).join(", ")})
              </span>
              <span className="font-semibold text-slate-900">+{formatCurrency(order.additional_items_fee || 0)}</span>
            </div>
          )}

          <div className="flex justify-between items-center text-slate-600">
            <span>Detergent ({order.detergent_name || "Hypoallergenic"})</span>
            <span className={Number(order.detergent_fee || 0) === 0 ? "font-bold text-emerald-600" : "font-semibold text-slate-900"}>
              {Number(order.detergent_fee || 0) === 0 ? "FREE" : `+${formatCurrency(order.detergent_fee || 0)}`}
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-600">
            <span>Doorstep Logistics (Pickup &amp; Delivery)</span>
            <span className="font-bold text-emerald-600">
              {order.delivery_fee === 0 ? "FREE ($0.00)" : `+${formatCurrency(order.delivery_fee)}`}
            </span>
          </div>
        </div>
      </div>

      {/* Customer Tip Selection Card (Selected by Customer in Green) */}
      <StepTipSelector tipAmount={tipAmount} onTipChange={setTipAmount} />

      {/* Final Cost Summary & Payment CTA */}
      <div className="p-5 rounded-3xl bg-slate-900 text-white shadow-xl space-y-4">
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-300">
            <span>Order Subtotal</span>
            <span>{formatCurrency(baseAmount)}</span>
          </div>
          {tipAmount > 0 && (
            <div className="flex justify-between text-emerald-400 font-bold">
              <span>Driver &amp; Crew Gratuity (Tip)</span>
              <span>+{formatCurrency(tipAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-black text-white pt-2 border-t border-slate-800">
            <span>Total Payable</span>
            <span className="text-xl text-primary font-black">{formatCurrency(totalWithTip)}</span>
          </div>
        </div>

        <Button
          type="button"
          variant="hero"
          size="lg"
          disabled={isSubmitting}
          onClick={handlePay}
          className="w-full bg-primary hover:bg-primary-dark text-white font-extrabold text-sm py-4 shadow-lg cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span>Redirecting to Stripe...</span>
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 mr-2" />
              <span>Pay {formatCurrency(totalWithTip)} with Card / Apple Pay</span>
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>

        <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Encrypted 256-bit Stripe Checkout &bull; Zero card details stored locally</span>
        </p>
      </div>
    </div>
  );
}

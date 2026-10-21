"use client";

import { Lock, Tag, ShieldCheck, ArrowLeft, ArrowRight, Loader2, CheckCircle2, CreditCard, Sparkles } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { CalculatedPriceResult } from "@/lib/stripe/pricing-calc";
import { StepTipSelector } from "./step-tip-selector";
import type { PricingMode } from "@/types";

interface StepPaymentProps {
  priceResult: CalculatedPriceResult;
  pricingMode?: PricingMode;
  promoCode: string;
  onPromoCodeChange: (code: string) => void;
  onApplyPromo: () => void;
  promoError?: string;
  paymentMethod?: string;
  onSelectPaymentMethod?: (m: "card" | "apple_pay") => void;
  tipAmount?: number;
  onTipChange?: (tip: number) => void;
  isProcessing: boolean;
  onConfirm: () => void;
  onBack: () => void;
}

export function StepPayment({
  priceResult, pricingMode = "per_bag", promoCode, onPromoCodeChange, onApplyPromo,
  promoError, tipAmount = 0, onTipChange, isProcessing, onConfirm, onBack,
}: StepPaymentProps) {
  const { subtotal, detergent_fee, additional_items_fee, delivery_fee, discount_amount, total_amount } = priceResult;
  const isFreeDelivery = delivery_fee === 0;
  const effectiveTip = typeof tipAmount === "number" ? tipAmount : priceResult.tip_amount || 0;
  const amountDueToday = delivery_fee + effectiveTip;
  const amountChargedLater = Math.max(0, subtotal + detergent_fee + additional_items_fee - discount_amount);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="p-6 rounded-3xl bg-white border-2 border-slate-100 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            Payment &amp; Checkout
          </h4>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 uppercase">
            Step 6 of 6
          </span>
        </div>

        {onTipChange && <StepTipSelector tipAmount={tipAmount} onTipChange={onTipChange} />}

        {/* 1. Itemized Cost Breakdown */}
        <div className="space-y-2 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Laundry Wash</span>
            <span className="font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
          </div>
          {detergent_fee > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Premium Detergent</span>
              <span className="font-semibold text-slate-900">+{formatCurrency(detergent_fee)}</span>
            </div>
          )}
          {additional_items_fee > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Additional Items</span>
              <span className="font-semibold text-slate-900">+{formatCurrency(additional_items_fee)}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-slate-600">
            <span>Doorstep Delivery {isFreeDelivery && <span className="text-[10px] font-bold text-emerald-700 ml-1">FREE</span>}</span>
            <span className={isFreeDelivery ? "font-bold text-emerald-600" : "font-semibold text-slate-900"}>
              {isFreeDelivery ? "$0.00" : formatCurrency(delivery_fee)}
            </span>
          </div>
          {discount_amount > 0 && (
            <div className="flex justify-between text-emerald-600 font-medium">
              <span>Coupon Discount</span>
              <span>-{formatCurrency(discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between font-black text-slate-900 text-sm border-t border-slate-200 pt-2 mt-1">
            <span>Order Price (Service &amp; Delivery)</span>
            <span className="text-base text-slate-900 font-black">{formatCurrency(total_amount)}</span>
          </div>
          {effectiveTip > 0 && (
            <div className="flex justify-between items-center text-xs text-emerald-700 font-semibold pt-1">
              <span>Driver Tip (Additional Gratuity)</span>
              <span>+{formatCurrency(effectiveTip)}</span>
            </div>
          )}
        </div>

        {/* 2. Transparent 2-Phase Payment Schedule */}
        <div className="p-4 rounded-2xl bg-linear-to-br from-pink-50/70 via-white to-slate-50 border-2 border-pink-200/90 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-primary" />
              Payment Schedule (What You Pay Now vs. Next)
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-100 text-primary-dark">
              No Surprise Fees
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Step 1: Paid Today */}
            <div className="p-3.5 rounded-xl bg-white border border-pink-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">1. Paid Today via Stripe</span>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">Checkout Now</span>
              </div>
              <span className="text-2xl font-black text-emerald-700 block">
                {amountDueToday > 0 ? formatCurrency(amountDueToday) : "$0.00"}
              </span>
              <p className="text-[11px] text-slate-600 font-medium leading-snug">
                {amountDueToday > 0
                  ? `${delivery_fee > 0 ? `Delivery Fee (${formatCurrency(delivery_fee)})` : "Free Delivery"}${effectiveTip > 0 ? ` + Driver Tip (${formatCurrency(effectiveTip)})` : ""}`
                  : "Free Delivery · Card verified & saved on file ($0.00 charged today)"}
              </p>
            </div>

            {/* Step 2: Next Charge */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">2. Next Charge (After Pickup)</span>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-pink-50 text-primary">In Custody</span>
              </div>
              <span className="text-2xl font-black text-primary block">
                {formatCurrency(amountChargedLater)}
              </span>
              <p className="text-[11px] text-slate-600 font-medium leading-snug">
                {pricingMode === "per_lb"
                  ? "Laundry wash based on scale weight measured upon pickup"
                  : "Laundry wash, fold & extras charged to your card on file once picked up"}
              </p>
            </div>
          </div>
        </div>

        {/* Promo Code */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
            <Tag className="h-3 w-3 text-primary" /> Coupon Code
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter promo code"
              value={promoCode}
              onChange={(e) => onPromoCodeChange(e.target.value.toUpperCase())}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={onApplyPromo}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Apply
            </button>
          </div>
          {promoError && <p className="text-[11px] text-rose-500">{promoError}</p>}
          {discount_amount > 0 && !promoError && (
            <p className="text-[11px] text-emerald-600 font-semibold">
              Coupon applied — {formatCurrency(discount_amount)} saved!
            </p>
          )}
        </div>

        {/* Stripe Checkout Card */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                S
              </div>
              <div>
                <span className="text-xs font-extrabold text-slate-900 block leading-tight">
                  Stripe Secure Checkout
                </span>
                <span className="text-[11px] text-slate-500">
                  Credit Card, Debit Card, Apple Pay, Google Pay
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Encrypted
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 space-y-1">
            <p className="font-bold text-slate-900">
              {amountDueToday > 0
                ? `You will see a charge of ${formatCurrency(amountDueToday)} on Stripe today for ${delivery_fee > 0 ? "doorstep delivery" : ""}${delivery_fee > 0 && effectiveTip > 0 ? " & " : ""}${effectiveTip > 0 ? "driver tip" : ""}.`
                : "You will see a $0.00 charge on Stripe today to verify and save your card on file."}
            </p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Your remaining laundry service charge of <strong className="text-slate-800">{formatCurrency(amountChargedLater)}</strong> will be charged to this saved card only after our courier picks up and weighs/processes your laundry.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] font-semibold text-slate-500">
            {["Visa", "Mastercard", "Amex", "Apple Pay", "Google Pay"].map((m) => (
              <span key={m} className="px-2 py-0.5 rounded bg-white border border-slate-200 shadow-2xs">{m}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={onBack} className="cursor-pointer">
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Review
        </Button>
        <Button
          variant="hero"
          size="lg"
          disabled={isProcessing}
          onClick={onConfirm}
          className="shadow-lg shadow-pink-500/25 cursor-pointer flex-1 sm:flex-none font-bold"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Redirecting to Stripe...
            </>
          ) : amountDueToday > 0 ? (
            <>
              Pay {formatCurrency(amountDueToday)} Today &amp; Save Card <ArrowRight className="h-4 w-4 ml-2" />
            </>
          ) : (
            <>
              Authorize Card &amp; Confirm Booking ($0.00 Today) <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
        <span>256-bit SSL Encrypted · PCI-DSS Level 1 Certified</span>
      </div>
    </div>
  );
}

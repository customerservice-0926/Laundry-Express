"use client";

import { Lock, Tag, ShieldCheck, ArrowLeft, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { CalculatedPriceResult } from "@/lib/stripe/pricing-calc";

interface StepPaymentProps {
  priceResult: CalculatedPriceResult;
  promoCode: string;
  onPromoCodeChange: (code: string) => void;
  onApplyPromo: () => void;
  promoError?: string;
  paymentMethod?: string;
  onSelectPaymentMethod?: (m: "card" | "apple_pay") => void;
  isProcessing: boolean;
  onConfirm: () => void;
  onBack: () => void;
}

export function StepPayment({
  priceResult,
  promoCode,
  onPromoCodeChange,
  onApplyPromo,
  promoError,
  isProcessing,
  onConfirm,
  onBack,
}: StepPaymentProps) {
  const { subtotal, delivery_fee, discount_amount, total_amount } = priceResult;
  const isFreeDelivery = delivery_fee === 0 && subtotal > 0;

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

        {/* Price Breakdown */}
        <div className="space-y-2 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Laundry Wash</span>
            <span className="font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span>
              Doorstep Delivery{" "}
              {isFreeDelivery && (
                <span className="text-[10px] font-bold text-emerald-700 ml-1">FREE</span>
              )}
            </span>
            <span
              className={
                isFreeDelivery ? "font-bold text-emerald-600" : "font-semibold text-slate-900"
              }
            >
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
            <span>Total Payable</span>
            <span className="text-base text-primary font-black">{formatCurrency(total_amount)}</span>
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
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-pink-50/30 border border-slate-200 space-y-3">
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

          <p className="text-xs text-slate-600 leading-relaxed">
            You will be redirected to Stripe’s secure hosted checkout page to complete your payment with your preferred method. Your card details are never stored on our servers.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-semibold text-slate-500">
            <span className="px-2 py-0.5 rounded bg-white border border-slate-200 shadow-2xs">Visa</span>
            <span className="px-2 py-0.5 rounded bg-white border border-slate-200 shadow-2xs">Mastercard</span>
            <span className="px-2 py-0.5 rounded bg-white border border-slate-200 shadow-2xs">Amex</span>
            <span className="px-2 py-0.5 rounded bg-white border border-slate-200 shadow-2xs">Apple Pay</span>
            <span className="px-2 py-0.5 rounded bg-white border border-slate-200 shadow-2xs">Google Pay</span>
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
          ) : (
            <>
              Proceed to Stripe Checkout ({formatCurrency(total_amount)}) <ArrowRight className="h-4 w-4 ml-2" />
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

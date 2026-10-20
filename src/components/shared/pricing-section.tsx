"use client";

import * as React from "react";
import Link from "next/link";
import { Check, ShoppingBag, Scale, Zap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingBubbles } from "./floating-bubbles";
import { useSettings, useSlot1Label, useSlot2Label } from "@/hooks/use-settings";

export function PricingSection() {
  const [pricing, setPricing] = React.useState<{
    bag_price: number;
    pound_price: number;
    min_lbs: number;
    free_delivery_threshold: number;
    free_delivery_lbs: number;
    standard_delivery_fee: number;
  } | null>(null);
  const settings = useSettings();
  const slot1 = useSlot1Label(settings);
  const slot2 = useSlot2Label(settings);

  React.useEffect(() => {
    fetch("/api/pricing", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        const data = await response.json();
        return data.pricing || null;
      })
      .then((data) => { if (data) setPricing(data); })
      .catch(() => {});
  }, []);

  return (
    <section id="pricing" className="relative overflow-hidden py-20 bg-slate-50/70 scroll-mt-20">
      <FloatingBubbles variant="banner" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold mb-3">
            <Zap className="h-3.5 w-3.5 fill-rose-600 text-rose-600" />
            <span>Clear &amp; Transparent</span>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
            Simple, Fair Pricing with Zero Surprises
          </h2>
          <p className="text-sm text-slate-600 mt-3 leading-relaxed">
            Order by the bag or by weight. The more laundry you bundle, the more you save.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Bag Pricing Card */}
          <div className="rounded-3xl p-8 bg-white border-2 border-sky-500 shadow-xl relative flex flex-col justify-between">
            <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-md">
              Most Popular
            </div>

            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-2xl bg-sky-100 text-sky-700">
                  <ShoppingBag className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Standard Bag Wash &amp; Fold</h3>
                  <p className="text-xs text-slate-500">13-gallon bag (about 2 loads)</p>
                </div>
              </div>

              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-black text-slate-900">{pricing ? `$${pricing.bag_price.toFixed(2)}` : "—"}</span>
                <span className="text-xs text-slate-500 font-semibold">/ bag</span>
              </div>

              {/* Delivery Fee highlight */}
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 mb-6 space-y-1.5 text-xs">
                <div className="flex justify-between items-center text-emerald-900 font-bold">
                  <span>Pickup &amp; Delivery:</span>
                  <span className="uppercase text-emerald-700 font-black bg-white px-2 py-0.5 rounded-md border border-emerald-200">{pricing && pricing.free_delivery_threshold ? `Free (${pricing.free_delivery_threshold}+ Bags)` : "Doorstep Delivery"}</span>
                </div>
                <p className="text-[11px] text-emerald-800">Free delivery on qualifying bag orders in our service area.</p>
              </div>

              <ul className="space-y-3 text-xs text-slate-700">
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Washed, dried, and neatly machine folded</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Choice of premium Tide or plant-based detergents</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Pickup &amp; drop-off photo proof included</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Scheduled pickup: {slot1} or {slot2}</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <Link href="#book-now" className="block w-full">
                <Button variant="hero" size="lg" className="w-full">
                  Book Laundry by Bag
                </Button>
              </Link>
            </div>
          </div>

          {/* Pound Pricing Card */}
          <div className="rounded-3xl p-8 bg-white border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-2xl bg-slate-100 text-slate-700">
                  <Scale className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">By Weight (Per Pound / lb)</h3>
                  <p className="text-xs text-slate-500">Commercial &amp; bulk laundry</p>
                </div>
              </div>

              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-black text-slate-900">{pricing ? `$${pricing.pound_price.toFixed(2)}` : "—"}</span>
                <span className="text-xs text-slate-500 font-semibold">/ lb ({pricing?.min_lbs ?? "—"} lbs min)</span>
              </div>

              {/* Delivery Fee highlight */}
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 mb-6 space-y-1.5 text-xs">
                <div className="flex justify-between items-center text-emerald-900 font-bold">
                  <span>Pickup &amp; Delivery:</span>
                  <span className="uppercase text-emerald-700 font-black bg-white px-2 py-0.5 rounded-md border border-emerald-200">{pricing && pricing.free_delivery_lbs ? `Free (${pricing.free_delivery_lbs}+ lbs)` : "Doorstep Delivery"}</span>
                </div>
                <p className="text-[11px] text-emerald-800">Free delivery on qualifying weight orders in our service area.</p>
              </div>

              <ul className="space-y-3 text-xs text-slate-700">
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Precision weighed on calibrated driver scale</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Perfect for bulk laundry, towels, and family loads</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Estimated upfront, verified at intake facility</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Pickup &amp; drop-off photo proof included</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <Link href="/order?mode=per_lb" className="block w-full">
                <Button variant="outline" size="lg" className="w-full">
                  Book Laundry by Pound
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Specialty Items Banner */}
        <div className="mt-8 p-4 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-pink-50 text-primary shrink-0">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <strong className="text-slate-900 block font-bold">Have specialty items? (Uniforms, shoe cleaning, comforters)</strong>
              <span className="text-slate-500">We offer specialty care starting at $15 with 100% free delivery.</span>
            </div>
          </div>
          <Link href="/pricing" className="shrink-0 font-bold text-primary hover:underline">
            View All Specialty Items &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingBubbles } from "./floating-bubbles";
import { HeroMascot } from "./hero-mascot";
import { OrderTrackingSummary } from "@/components/home/order-tracking-summary";
import { useSettings } from "@/hooks/use-settings";

/**
 * HeroSection Component
 *
 * Primary landing hero experience featuring:
 * - Dynamic live bag pricing synced directly from admin settings
 * - Animated transparent vector Bubble Hero mascot with gentle bobbing
 * - High-conversion value propositions, bag pricing, and delivery thresholds
 */
interface HeroSectionProps {
  initialBagPrice?: number;
}

export function HeroSection({ initialBagPrice }: HeroSectionProps) {
  const [bagPrice, setBagPrice] = React.useState<number | null>(() => initialBagPrice ?? null);
  const { deliveryZones } = useSettings();

  React.useEffect(() => {
    fetch("/api/pricing")
      .then((res) => res.json())
      .then((data) => {
        if (data?.pricing) {
          const price = Number(data.pricing.bag_price);
          if (price > 0) setBagPrice(price);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section
      className="relative overflow-hidden pt-20 pb-16 lg:pt-28 lg:pb-20"
      style={{ background: "linear-gradient(160deg, var(--primary-pale) 0%, var(--foam-white) 70%)" }}
    >
      {/* Ambient Floating Mascot Bubbles */}
      <FloatingBubbles variant="hero" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Hero Content (7 Cols) */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Unified Top Animated Badge: Location Highlight + Free Delivery */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-primary-pale shadow-xs text-xs font-medium text-slate-800">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
              </span>
              <p className="font-bold text-slate-900">
                {deliveryZones.length ? deliveryZones.join(", ") : "Local Service Coverage"} &bull; <span className="text-emerald-700 uppercase font-black">Doorstep Pickup &amp; Delivery</span>
              </p>
            </div>

            {/* Main Headline & Tagline */}
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.05]">
                Laundry Piling Up?
              </h1>
              <p className="text-xl sm:text-2xl lg:text-3xl font-black gradient-text tracking-tight">
                Pick Up • Wash • Fold • Deliver
              </p>
            </div>

            {/* Sub-tagline & Value Proposition */}
            <div className="space-y-1 max-w-xl mx-auto lg:mx-0">
              <p className="text-base sm:text-lg font-black text-slate-900">
                More Time For What Matters.
              </p>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
                {bagPrice !== null && <>Only <strong className="text-slate-900 font-black">${bagPrice.toFixed(2)} per 13-gallon bag</strong> (about 2 loads). </>}Professional wash, dry, and crisp fold returned fresh to your doorstep within 24 hours.
              </p>
            </div>

            {/* Core Perks */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 max-w-lg mx-auto lg:mx-0 text-xs">
              <div className="p-3 rounded-xl bg-white border border-primary-pale shadow-2xs text-center sm:text-left">
                <span className="font-bold text-slate-900 block text-sm">{bagPrice !== null ? `$${bagPrice.toFixed(2)} / Bag` : "Rates set by Laundry Express"}</span>
                <span className="text-slate-500 font-medium">{bagPrice !== null ? "About 2 Loads (13-Gal)" : "View current plans"}</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-primary-pale shadow-2xs text-center sm:text-left">
                <span className="font-bold text-slate-900 block text-sm">24h Express</span>
                <span className="text-primary-dark font-bold">Doorstep Turnaround</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-primary-pale shadow-2xs text-center sm:text-left">
                <span className="font-bold text-slate-900 block text-sm">Eco Washed</span>
                <span className="text-slate-500 font-medium">Tide &amp; Hypoallergenic</span>
              </div>
            </div>

            {/* Call to Actions with Pink Primary Color */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <Link href="/order" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-primary hover:bg-primary-dark text-white shadow-lg shadow-primary/25"
                >
                  Schedule Your Pickup
                  <ArrowRight className="h-4 w-4 ml-2 shrink-0" />
                </Button>
              </Link>

              <Link href="/pricing" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto border-slate-300 hover:border-primary-light hover:bg-primary-pale/50"
                >
                  View Plans &amp; Pricing
                </Button>
              </Link>
            </div>

            {/* Trust Indicator */}
            <div className="pt-1 flex items-center justify-center lg:justify-start gap-2.5 text-xs">
              <div className="flex items-center text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="h-3.5 w-3.5 fill-amber-400" />
                ))}
              </div>
              <span className="font-bold text-slate-900">Top Rated Premium Service</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-600 font-medium">100% Doorstep Satisfaction</span>
            </div>
          </div>

          {/* Right Mascot Artwork: Transparent Floating Bubble Hero (5 Cols) */}
          <div className="lg:col-span-5 relative flex justify-center items-center">
            <HeroMascot />
          </div>
        </div>

        {/* Static 4-Stage Transparency Summary Graphic */}
        <div className="pt-4">
          <OrderTrackingSummary />
        </div>
      </div>
    </section>
  );
}

export default HeroSection;

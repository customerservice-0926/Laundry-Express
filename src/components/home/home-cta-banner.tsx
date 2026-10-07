"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Star,
  Clock,
  Lock,
} from "lucide-react";
import { useSettings, useSlot1Label, useSlot2Label } from "@/hooks/use-settings";
import { Button } from "@/components/ui/button";
import { FloatingBubbles } from "@/components/shared/floating-bubbles";

/**
 * HomeCtaBanner Component
 *
 * High-conversion visual banner positioned above the global footer:
 * - Features dynamic levitating Bubble Hero mascot with rotating orbital halo
 * - Floating interactive status badges (24h turnaround & photo verification)
 * - Shimmer shine CTA action button to maximize client conversion
 * - Responsive non-breaking pill guarantees
 */
export function HomeCtaBanner() {
  const prefersReduced = useReducedMotion();
  const settings = useSettings();
  const slot1 = useSlot1Label(settings);
  const slot2 = useSlot2Label(settings);

  return (
    <section
      aria-labelledby="cta-heading"
      className="py-16 sm:py-20 bg-gradient-to-b from-white to-primary-pale/40 text-white relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Luxury Glassmorphic Card Container */}
        <div className="relative overflow-hidden rounded-3xl bg-black border border-primary/30 shadow-[0_0_60px_var(--primary-ghost)] p-8 sm:p-12 lg:p-14">
          {/* Ambient Floating Soap Bubbles inside banner */}
          <FloatingBubbles variant="banner" className="opacity-75" />

          {/* Ambient Brand Halo lighting behind banner content */}
          <div
            aria-hidden="true"
            className="absolute -top-24 -right-24 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none -z-10"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-24 -left-24 w-96 h-96 bg-secondary/15 rounded-full blur-3xl pointer-events-none -z-10"
          />

          <div className="flex flex-col lg:flex-row items-center justify-between gap-12 relative z-10">
            {/* Left Value Proposition & Details */}
            <div className="space-y-5 text-center lg:text-left max-w-2xl">
              {/* Animated Live Status Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary-light text-xs font-black uppercase tracking-wider backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                <span className="whitespace-nowrap">Instant Doorstep Laundry Pickup</span>
              </div>

              <h2
                id="cta-heading"
                className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight text-balance"
              >
                Ready for Clean Clothes{" "}
                <span className="gradient-text whitespace-nowrap">Without Lifting a Finger?</span>
              </h2>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal text-pretty">
                Book your pickup in under 2 minutes. We collect from your porch, wash and fold to crisp perfection, and return fresh to your doorstep in 24 hours.
              </p>

              {/* Guarantees & Features — Self-contained non-breaking pills */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 pt-1 text-xs">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-200 whitespace-nowrap backdrop-blur-sm">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="font-medium">Dual Photo Proofs</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-200 whitespace-nowrap backdrop-blur-sm">
                  <Sparkles className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium">Tide &amp; Eco Detergents</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-200 whitespace-nowrap backdrop-blur-sm">
                  <Clock className="h-4 w-4 text-sky-400 shrink-0" />
                  <span className="font-bold text-white">Daily {slot1} &amp; {slot2}</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300 whitespace-nowrap backdrop-blur-sm">
                  <Lock className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span className="font-medium">Zero-Lost Guarantee</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link href="/order" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="relative overflow-hidden w-full sm:w-auto bg-primary hover:bg-primary-dark text-white font-black shadow-xl shadow-primary/35 text-base px-8 py-5 h-auto transition-all active:scale-[0.98] whitespace-nowrap group cursor-pointer"
                  >
                    {/* Animated Shimmer Light Beam */}
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none"
                    />
                    <span>Book Pickup Now</span>
                    <ArrowRight className="h-5 w-5 ml-2 shrink-0 text-white transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>

                <Link href="/pricing" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto bg-white/10 hover:bg-white text-white hover:text-slate-900 border-white/30 text-sm font-bold transition-all px-7 py-4 h-auto whitespace-nowrap"
                  >
                    <span>Compare Plans &amp; Bags</span>
                  </Button>
                </Link>
              </div>

              {/* Trust Social Bar */}
              <div className="flex items-center justify-center lg:justify-start gap-2 text-xs text-slate-400 pt-1">
                <div className="flex items-center text-amber-400">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="h-3.5 w-3.5 fill-amber-400" />
                  ))}
                </div>
                <span className="font-bold text-white">4.9 / 5 Rating</span>
                <span className="text-slate-600">•</span>
                <span>10,000+ Clean Bags Returned</span>
              </div>
            </div>

            {/* Right Side: Animated Levitating Mascot Hero Showcase */}
            <div className="relative shrink-0 flex items-center justify-center py-4">
              <motion.div
                className="relative flex items-center justify-center"
                animate={
                  prefersReduced
                    ? {}
                    : {
                        y: [-8, 8, -8],
                        rotate: [-1.5, 1.5, -1.5],
                      }
                }
                transition={{
                  duration: 3.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                {/* Glowing Pulsing Radiant Halo */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/40 via-primary-light/25 to-secondary/30 blur-3xl pointer-events-none scale-125 animate-pulse"
                />

                {/* Dashed Orbital Rotating Ring */}
                <div
                  aria-hidden="true"
                  className="absolute -inset-6 rounded-full border border-primary/25 animate-spin [animation-duration:22s] pointer-events-none border-dashed"
                />

                {/* Floating Orbiting Satellite Badge 1 (Top-Left) */}
                <motion.div
                  className="absolute -top-4 -left-6 z-20 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-slate-900 border border-primary/30 shadow-xl text-xs font-black backdrop-blur-md whitespace-nowrap"
                  animate={prefersReduced ? {} : { y: [4, -6, 4] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Zap className="h-3.5 w-3.5 text-primary fill-primary shrink-0" />
                  <span>24h Turnaround</span>
                </motion.div>

                {/* Floating Orbiting Satellite Badge 2 (Bottom-Right) */}
                <motion.div
                  className="absolute -bottom-3 -right-6 z-20 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-slate-900 border border-emerald-300 shadow-xl text-xs font-black backdrop-blur-md whitespace-nowrap"
                  animate={prefersReduced ? {} : { y: [-5, 5, -5] }}
                  transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                >
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Photo Proof Logged</span>
                </motion.div>

                {/* Mascot Glass Card with Hover Zoom */}
                <div className="relative h-60 w-60 sm:h-72 sm:w-72 rounded-3xl bg-white/5 border border-white/15 backdrop-blur-md shadow-2xl flex items-center justify-center p-4 group cursor-pointer transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_40px_var(--primary-ghost)]">
                  <div className="relative w-full h-full transition-transform duration-500 group-hover:scale-110">
                    <Image
                      src="/brand/logo.jpeg"
                      alt="Laundry Express Official Logo"
                      fill
                      sizes="(max-width: 640px) 240px, 288px"
                      className="object-contain drop-shadow-[0_15px_35px_rgba(236,72,153,0.35)]"
                      priority
                    />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HomeCtaBanner;

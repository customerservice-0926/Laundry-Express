"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  Sparkles,
  Zap,
  Heart,
} from "lucide-react";

/**
 * HeroMascot Component
 *
 * Visual hero element featuring the "Bubble Hero" mascot:
 * - Fluid, attractive animations powered by Framer Motion
 * - Clean, non-messy composition with contained floating satellites
 * - Radiant ambient halo and dashed orbital ring
 * - Interactive spring hover on mascot character
 */
export function HeroMascot() {
  const prefersReduced = useReducedMotion();

  return (
    <div className="relative flex flex-col items-center justify-center w-full max-w-md mx-auto select-none">
      {/* Soft Multi-Layered Ambient Halo behind mascot */}
      <div
        aria-hidden="true"
        className="absolute w-72 h-72 sm:w-84 sm:h-84 rounded-full bg-linear-to-tr from-primary-pale via-primary-light/25 to-secondary/20 blur-3xl pointer-events-none -z-10 animate-pulse"
      />

      {/* Main Animated Levitation Wrapper */}
      <motion.div
        className="relative w-72 sm:w-84 h-72 sm:h-84 flex items-center justify-center"
        animate={
          prefersReduced
            ? {}
            : {
              y: [-6, 6, -6],
              rotate: [-1, 1, -1],
            }
        }
        transition={{
          duration: 4.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Subtle Dashed Orbital Halo Ring */}
        <div
          aria-hidden="true"
          className="absolute -inset-2 sm:-inset-4 rounded-full border border-primary/20 pointer-events-none border-dashed animate-spin [animation-duration:32s]"
        />

        {/* Floating Mini Satellite Badge - Top Left */}
        <motion.div
          aria-hidden="true"
          className="absolute top-2 left-0 sm:-left-2 z-20 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-md border border-primary-pale flex items-center gap-1.5 whitespace-nowrap"
          animate={prefersReduced ? {} : { y: [3, -4, 3] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="h-5 w-5 rounded-full bg-primary-pale flex items-center justify-center text-primary">
            <Heart className="h-3 w-3 fill-primary" />
          </div>
          <span className="text-[11px] font-bold text-slate-800">
            Pick Up • Wash
          </span>
        </motion.div>

        {/* Floating Mini Satellite Badge - Top Right */}
        <motion.div
          aria-hidden="true"
          className="absolute top-6 right-0 sm:-right-2 z-20 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-md border border-sky-100 flex items-center gap-1.5 whitespace-nowrap"
          animate={prefersReduced ? {} : { y: [-4, 4, -4] }}
          transition={{
            duration: 3.2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.3,
          }}
        >
          <div className="h-5 w-5 rounded-full bg-sky-100 flex items-center justify-center text-sky-600">
            <Sparkles className="h-3 w-3 fill-sky-600" />
          </div>
          <span className="text-[11px] font-bold text-slate-800">
            Fold &amp; Deliver
          </span>
        </motion.div>

        {/* Bubble Hero Mascot Image Container with Interactive Hover Spring */}
        <motion.div
          className="relative w-64 h-64 sm:w-76 sm:h-76 flex items-center justify-center group cursor-pointer"
          whileHover={prefersReduced ? {} : { scale: 1.05 }}
          transition={{ type: "spring", stiffness: 280, damping: 18 }}
        >
          <Image
            src="/brand/hero.jpeg"
            alt="Laundry Express Bubble Hero Mascot"
            width={340}
            height={340}
            priority
            className="w-full h-full object-contain mix-blend-multiply drop-shadow-2xl transition-transform duration-500"
          />
        </motion.div>

        {/* Clean Floating Bubble Hero Verified Badge */}
        <motion.div
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-11/12 max-w-68.75 z-20 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-primary-pale shadow-xl flex items-center justify-between"
          animate={prefersReduced ? {} : { y: [-2, 2, -2] }}
          transition={{
            duration: 3.6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.6,
          }}
        >
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-primary-pale text-primary flex items-center justify-center font-bold shadow-xs shrink-0">
              <Zap className="h-4 w-4 fill-primary" />
            </div>
            <div className="text-left">
              <h4 className="font-extrabold text-slate-900 text-xs leading-tight">
                Bubble Hero
              </h4>
              <p className="text-[10px] text-slate-500 font-normal ">
                Spotless &amp; Protected
              </p>
            </div>
          </div>

          <span className="text-[11px] font-black text-primary-dark bg-primary-pale px-2.5 py-1 rounded-full border border-primary-light/40 shrink-0 whitespace-nowrap">
            24h Fast
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default HeroMascot;

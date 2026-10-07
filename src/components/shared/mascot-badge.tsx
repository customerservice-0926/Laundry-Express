import Image from "next/image";
import { Sparkles, Zap, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type MascotSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface MascotBadgeProps {
  size?: MascotSize;
  withSpeech?: boolean;
  speechText?: string;
  speechPosition?: "right" | "top" | "bottom";
  className?: string;
}

/**
 * MascotBadge Component
 *
 * Official brand visual component featuring the "Bubble Hero" mascot:
 * superhero cape, boots, bubbly foam white, electric blue, and coral red accents.
 */
export function MascotBadge({
  size = "md",
  withSpeech = false,
  speechText = "⚡ 2+ Bags = Free Superhero Delivery!",
  speechPosition = "right",
  className,
}: MascotBadgeProps) {
  const dimensions: Record<MascotSize, { width: number; height: number; container: string }> = {
    xs: { width: 32, height: 32, container: "w-8 h-8" },
    sm: { width: 44, height: 44, container: "w-11 h-11" },
    md: { width: 72, height: 72, container: "w-18 h-18" },
    lg: { width: 120, height: 120, container: "w-30 h-30" },
    xl: { width: 160, height: 160, container: "w-40 h-40" },
  };

  const isVertical = speechPosition === "top" || speechPosition === "bottom";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-3",
        isVertical ? "flex-col" : "flex-row",
        className
      )}
    >
      <div className="relative group">
        {/* Glowing halo behind mascot */}
        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-sky-400 to-rose-400 opacity-30 blur-md group-hover:opacity-60 transition duration-300" />

        <div
          className={cn(
            "relative rounded-full overflow-hidden border-2 border-white shadow-md bg-white flex items-center justify-center",
            dimensions[size].container
          )}
        >
          <Image
            src="/brand/logo-badge.jpeg"
            alt="Laundry Express Bubble Superhero Mascot"
            width={dimensions[size].width}
            height={dimensions[size].height}
            className="object-cover transform group-hover:scale-105 transition duration-300"
            priority
          />
        </div>
      </div>

      {withSpeech && (
        <div
          role="status"
          className="relative bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-2xl rounded-tl-sm border border-sky-100 shadow-sm text-xs font-semibold text-slate-800 flex items-center gap-1.5 animate-in fade-in duration-300 select-none"
        >
          <Zap className="h-3.5 w-3.5 text-rose-500 fill-rose-500 shrink-0" />
          <span>{speechText}</span>
          <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
        </div>
      )}
    </div>
  );
}

/**
 * MascotHeroEmblem Component
 *
 * Floating emblem showcase with verified superhero guarantee text.
 */
export function MascotHeroEmblem({
  badgeText = "Doorstep Laundry Hero",
  subText = "Photo Proof Guarantee",
}: {
  badgeText?: string;
  subText?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/80 backdrop-blur-md border border-sky-100 shadow-xs">
      <MascotBadge size="sm" />
      <div className="text-left text-xs">
        <span className="font-extrabold text-slate-900 block leading-tight">{badgeText}</span>
        <span className="text-[11px] text-sky-700 font-semibold flex items-center gap-1 mt-0.5">
          <ShieldCheck className="h-3 w-3 text-emerald-600" />
          {subText}
        </span>
      </div>
    </div>
  );
}

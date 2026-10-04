"use client";

import { Sparkles, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import type { PricingMode } from "@/types";
import { Button } from "@/components/ui/button";
import { useDetergents } from "@/hooks/use-detergents";

function fmt12(t?: string): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12}:00 ${ampm}` : `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

interface StepReviewProps {
  pricingMode: PricingMode;
  bagCount: number;
  weightLbs: number;
  selectedDetergentId?: string;
  selectedDate: string;
  selectedSlot: string;
  address: string;
  phone?: string;
  isOutOfHome: boolean;
  slot1Start: string;
  slot1End: string;
  slot2Start: string;
  slot2End: string;
  packageName?: string;
  packageCapacity?: number;
  packageUnit?: "bag" | "lb";
  onEditStep: (step: number) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function StepReview({
  pricingMode,
  bagCount,
  weightLbs,
  packageName,
  packageCapacity,
  packageUnit,
  selectedDetergentId,
  selectedDate,
  selectedSlot,
  address,
  phone,
  isOutOfHome,
  slot1Start,
  slot1End,
  slot2Start,
  slot2End,
  onEditStep,
  onBack,
  onContinue,
}: StepReviewProps) {
  const { detergents } = useDetergents();
  const selectedDetergent = detergents.find((detergent) => detergent.id === selectedDetergentId);
  const detergentName = selectedDetergent?.name || "Selected detergent";
  const detergentFee = Number(selectedDetergent?.price || 0);
  const getPlanDescription = () => {
    if (pricingMode === "per_bag") return `${bagCount} Standard 13-Gal Bag${bagCount > 1 ? "s" : ""}`;
    if (pricingMode === "per_lb") return `${weightLbs} lbs Weighed Volume`;
    if (packageName) return `${packageName} (${packageCapacity || 0} ${packageUnit === "lb" ? "lbs" : "bags"} included)`;
    return "Wash & Fold Package Plan";
  };

  const getSlotLabel = () => {
    if (selectedSlot === "8am-12pm") return `${fmt12(slot1Start)} – ${fmt12(slot1End)}`;
    return `${fmt12(slot2Start)} – ${fmt12(slot2End)}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="p-6 rounded-3xl bg-white border-2 border-sky-100 shadow-md space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-sky-600" />
            Review Your Order
          </h4>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Step 5 of 6
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-400 uppercase font-bold text-[10px]">Service Plan</span>
            <p className="font-bold text-slate-900">{getPlanDescription()}</p>
            <button type="button" onClick={() => onEditStep(1)} className="text-sky-600 font-semibold hover:underline cursor-pointer">Edit Plan →</button>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-400 uppercase font-bold text-[10px]">Detergent &amp; Cycle</span>
            <p className="font-bold text-slate-900">
              {detergentName} <span className={detergentFee === 0 ? "text-emerald-700 font-semibold" : "text-amber-700 font-bold"}>({detergentFee === 0 ? "Free · Included" : `+$${detergentFee.toFixed(2)}`})</span>
            </p>
            <p className="text-[11px] text-slate-500">Standard Cold Eco-Wash (30°C)</p>
            <button type="button" onClick={() => onEditStep(2)} className="text-sky-600 font-semibold hover:underline cursor-pointer">Edit Detergent →</button>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-400 uppercase font-bold text-[10px]">Pickup Slot</span>
            <p className="font-bold text-slate-900">{selectedDate}</p>
            <p className="text-slate-600">{getSlotLabel()}</p>
            <button type="button" onClick={() => onEditStep(3)} className="text-sky-600 font-semibold hover:underline cursor-pointer">Edit Schedule →</button>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-400 uppercase font-bold text-[10px]">Address &amp; Contact</span>
            <p className="font-bold text-slate-900 break-words">{address || "—"}</p>
            {phone && <p className="text-[11px] font-semibold text-slate-700">Phone: {phone}</p>}
            <span className="text-[11px] text-slate-500 block">
              {isOutOfHome ? "Away — Contactless Doorstep Pickup" : "Home — Driver Rings Bell"}
            </span>
            <button type="button" onClick={() => onEditStep(4)} className="text-sky-600 font-semibold hover:underline cursor-pointer">Edit Address &amp; Phone →</button>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">100% Photo Proof Guarantee</span>
            <span className="text-[11px] text-emerald-700">Driver uploads a time-stamped photo at pickup and return. Visible in your portal.</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={onBack} className="cursor-pointer">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Address
        </Button>
        <Button variant="hero" size="lg" onClick={onContinue} className="cursor-pointer">
          Proceed to Payment <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

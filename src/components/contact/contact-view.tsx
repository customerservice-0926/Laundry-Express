"use client";

import Link from "next/link";
import { MapPin, Clock, ShieldCheck, Sparkles } from "lucide-react";
import { LocationCard, OFFICIAL_LOCATION } from "@/components/contact/location-card";
import { GoggleMap } from "@/components/shared/google-map";
import { ContactForm } from "@/components/contact/contact-form";
import { useSettings, useSlot1Label, useSlot2Label } from "@/hooks/use-settings";

export function ContactView() {
  const settings = useSettings();
  const slot1 = useSlot1Label(settings);
  const slot2 = useSlot2Label(settings);

  return (
    <div className="w-full space-y-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
        <div className="lg:col-span-6 flex flex-col justify-between">
          <LocationCard
            location={OFFICIAL_LOCATION}
            operatingHours={settings.operatingHours}
            slot1={slot1}
            slot2={slot2}
          />
        </div>
        <div className="lg:col-span-6 min-h-[460px] sm:min-h-[520px] flex">
          <GoggleMap
            title={OFFICIAL_LOCATION.title}
            className="w-full h-full min-h-[460px] sm:min-h-[520px]"
          />
        </div>
      </div>

      {/* Dispatch Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-pink-100 text-primary flex items-center justify-center shrink-0">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-black text-slate-900 block">Service Coverage</span>
            <span className="text-[11px] text-slate-500">40-mile radius across Northern Illinois (Free up to 30 mi, $10 for 30–40 mi)</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-pink-100 text-primary flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-black text-slate-900 block">Pickup Windows</span>
            <span className="text-[11px] text-slate-500">{slot1} &amp; {slot2}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-pink-100 text-primary flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-black text-slate-900 block">Guaranteed Photo Proof</span>
            <span className="text-[11px] text-slate-500">Intake &amp; Doorstep Delivery Verified</span>
          </div>
        </div>
      </div>

      <div className="pt-2 max-w-4xl mx-auto">
        <ContactForm />
      </div>

      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 text-center text-xs text-slate-500 shadow-2xs space-y-3">
        <p className="leading-relaxed text-slate-600 max-w-2xl mx-auto">
          Need a special pickup request or have delicate wash requirements? Explore our{" "}
          <Link href="/pricing" className="text-primary font-black hover:underline">Plans &amp; Bags</Link>{" "}
          or inspect our{" "}
          <Link href="/#faq" className="text-primary font-black hover:underline">Frequently Asked Questions</Link>
          .
        </p>
        <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>Local family-operated laundry delivery service serving McHenry County</span>
        </div>
      </div>
    </div>
  );
}

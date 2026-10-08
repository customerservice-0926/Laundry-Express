"use client";

import * as React from "react";
import Link from "next/link";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PricingConfig } from "@/types";
import { useSettings, useSlot1Label, useSlot2Label } from "@/hooks/use-settings";
import { usePackagePlans } from "@/hooks/use-package-plans";
import { useDetergents } from "@/hooks/use-detergents";

interface PlanComparisonProps {
  initialRates?: Partial<PricingConfig>;
}

type ColumnKey = "bag" | "pound" | "package";

const COLUMNS: Array<{ key: ColumnKey; label: string; color: string }> = [
  { key: "bag", label: "By the Bag", color: "text-sky-700" },
  { key: "pound", label: "By the Pound", color: "text-slate-800" },
  { key: "package", label: "Saver Packages", color: "text-rose-700" },
];

export function PlanComparison({ initialRates }: PlanComparisonProps) {
  const [pricing, setPricing] = React.useState<Partial<PricingConfig> | undefined>(initialRates);
  const settings = useSettings();
  const slot1 = useSlot1Label(settings);
  const slot2 = useSlot2Label(settings);
  const { plans } = usePackagePlans();
  const { detergents } = useDetergents();

  React.useEffect(() => {
    fetch("/api/pricing")
      .then((r) => r.json())
      .then((d) => { if (d?.pricing) setPricing(d.pricing); })
      .catch(() => {});
  }, []);

  const bagPrice = Number(pricing?.bag_price ?? 0);
  const poundPrice = Number(pricing?.pound_price ?? 0);
  const minLbs = Number(pricing?.min_lbs ?? 0);
  const deliveryFee = Number(pricing?.standard_delivery_fee ?? 0);
  const freeBags = Number(pricing?.free_delivery_threshold ?? 0);
  const freeLbs = Number(pricing?.free_delivery_lbs ?? 0);

  const cheapest = plans.reduce<(typeof plans)[number] | undefined>(
    (min, p) => (!min || p.discounted_price < min.discounted_price ? p : min),
    undefined,
  );
  const columns = cheapest ? COLUMNS : COLUMNS.filter((c) => c.key !== "package");
  const detergentNames = detergents.filter((d) => d.is_active).map((d) => d.name).join(", ") || "Choose at checkout";
  const windows = `${slot1} or ${slot2} Daily`;

  const rows: Array<{ feature: string } & Record<ColumnKey, string>> = [
    {
      feature: "Base Pricing Rate",
      bag: `$${bagPrice.toFixed(2)} / 13-gal bag (about 2 loads)`,
      pound: `$${poundPrice.toFixed(2)} / lb (${minLbs} lbs min)`,
      package: cheapest
        ? `From $${cheapest.discounted_price.toFixed(2)} for ${cheapest.capacity} ${cheapest.unit_type === "lb" ? "lbs" : "bags"}`
        : "",
    },
    {
      feature: "Delivery Fee Policy",
      bag: `$${deliveryFee.toFixed(2)} under ${freeBags} bags | ${freeBags}+ bags FREE`,
      pound: `$${deliveryFee.toFixed(2)} under ${freeLbs} lbs | ${freeLbs}+ lbs FREE`,
      package: "FREE on every package",
    },
    { feature: "Pickup & Drop-off Windows", bag: windows, pound: windows, package: windows },
    { feature: "Detergent Choice", bag: detergentNames, pound: detergentNames, package: detergentNames },
    {
      feature: "Photo Proof Guarantee",
      bag: "Pickup & drop-off photo",
      pound: "Pickup, scale weight & drop-off photo",
      package: "Pickup & drop-off photo",
    },
    {
      feature: "Best Suited For",
      bag: "Individuals, couples, weekly family laundry",
      pound: "Airbnb hosts, heavy duvets, gyms",
      package: "Frequent wash households & roommates",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <h3 className="text-2xl font-bold text-slate-900">Compare Laundry Plans Side-by-Side</h3>
        <p className="text-sm text-slate-600 mt-1">Pick what works best for your schedule and budget. Zero hidden fees.</p>
      </div>

      <div className="hidden md:block bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[640px] text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                <th scope="col" className="py-4 px-6 font-bold whitespace-nowrap">Feature</th>
                {columns.map((c) => (
                  <th key={c.key} scope="col" className={`py-4 px-6 font-bold whitespace-nowrap ${c.color}`}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.feature} className="hover:bg-slate-50/50 transition-colors">
                  <th scope="row" className="py-4 px-6 font-bold text-slate-900 whitespace-nowrap">{row.feature}</th>
                  {columns.map((c) => (
                    <td key={c.key} className="py-4 px-6 text-slate-700 font-medium break-words">{row[c.key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="md:hidden space-y-4">
        {rows.map((row) => (
          <div key={row.feature} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2 text-xs">
            <span className="font-bold text-slate-900 block pb-1 border-b border-slate-100">{row.feature}</span>
            <dl className="grid grid-cols-1 gap-1.5 pt-1">
              {columns.map((c) => (
                <div key={c.key} className="flex justify-between items-start gap-3">
                  <dt className="text-slate-500 font-medium shrink-0">{c.label}</dt>
                  <dd className={`font-semibold text-right break-words min-w-0 ${c.color}`}>{row[c.key]}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      <div className="p-6 rounded-2xl bg-linear-to-r from-sky-50 to-blue-50 border border-sky-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">100% Satisfaction or Free Re-Wash</h4>
            <p className="text-xs text-slate-600">Every garment is backed by our Happiness Guarantee and real-time driver photo verification.</p>
          </div>
        </div>
        <Link href="/order" className="shrink-0 w-full sm:w-auto">
          <Button variant="hero" size="sm" className="w-full sm:w-auto">
            <span>Book Your Laundry Pickup</span>
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

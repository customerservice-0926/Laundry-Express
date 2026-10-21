"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles, Shirt, Footprints, Layers, ShieldCheck, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { useAdditionalItems } from "@/hooks/use-additional-items";
import type { AdditionalItem } from "@/types";

interface AdditionalItemsPricingGridProps {
  initialItems?: AdditionalItem[];
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  uniforms: Shirt,
  clothing: Shirt,
  footwear: Footprints,
  bedding: Layers,
  specialty: Sparkles,
};

export function AdditionalItemsPricingGrid({
  initialItems,
  title = "Specialty & Additional Items",
  subtitle = "Have sports gear, heavy comforters, or footwear? Add specialty cleaning items directly to any wash order at simple flat rates.",
  showHeader = true,
}: AdditionalItemsPricingGridProps) {
  const { items: fetchedItems, isLoading } = useAdditionalItems();
  const displayItems = (initialItems && initialItems.length > 0) ? initialItems : fetchedItems;

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-100 text-pink-800 text-xs font-bold border border-pink-200">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Specialty Garment &amp; Equipment Care</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {subtitle}
          </p>
        </div>
      )}

      {isLoading && (!displayItems || displayItems.length === 0) ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-56 rounded-3xl bg-slate-100 animate-pulse border border-slate-200" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {displayItems.map((item) => {
            const catKey = (item.category || "specialty").toLowerCase();
            const Icon = CATEGORY_ICONS[catKey] || Sparkles;
            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl p-6 border-2 border-slate-200 hover:border-pink-300 hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="p-2.5 rounded-xl bg-pink-50 text-primary border border-pink-100">
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className="capitalize text-[11px] font-bold text-slate-600">
                      {item.category || "Specialty"}
                    </Badge>
                  </div>

                  <h3 className="text-lg font-black text-slate-900">{item.name}</h3>

                  <div className="flex items-baseline gap-1 mt-2 mb-3">
                    <span className="text-3xl font-black text-primary">
                      {formatCurrency(item.price)}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">/ item</span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    {item.description || "Specialty care wash and gentle dried to preserve material integrity."}
                  </p>

                  <ul className="space-y-2 text-xs text-slate-600 mb-6 border-t border-slate-100 pt-3">
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Dedicated gentle or deep-clean cycle</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <ShieldCheck className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                      <span>Zero lost-garment photo intake proof</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <Link href={`/order?add_item=${encodeURIComponent(item.name)}`} className="block w-full">
                    <Button variant="hero" size="sm" className="w-full">
                      <span>Add to Order</span>
                      <ArrowRight className="h-4 w-4 ml-1.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Specialty Custom Request Callout Banner */}
      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white border border-slate-200 text-primary shadow-2xs shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <strong className="block text-slate-900 text-sm">Need something else cleaned?</strong>
            <span>Have hockey gear, sleeping bags, or specialty items? Note them in your order or contact us for custom pricing.</span>
          </div>
        </div>
        <Link href="/order" className="shrink-0 w-full sm:w-auto">
          <Button variant="outline" size="sm" className="w-full sm:w-auto font-bold border-slate-300">
            Book Laundry Pickup
          </Button>
        </Link>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePackagePlans } from "@/hooks/use-package-plans";

export function PlanPackagesGrid() {
  const { plans, isLoading: loading } = usePackagePlans();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto py-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-72 rounded-3xl bg-slate-100 animate-pulse border border-slate-200" />
        ))}
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="max-w-md mx-auto p-8 rounded-3xl bg-slate-50 border border-slate-200 text-center space-y-4">
        <h4 className="font-bold text-sm text-slate-800">No Package Passes Currently Published</h4>
        <p className="text-xs text-slate-500">
          Discounted multi-bag saver bundles are added periodically by admin. You can book individual loads immediately with our standard plans!
        </p>
        <Link href="/order" className="inline-block">
          <Button size="sm" className="bg-primary hover:bg-primary-dark text-white font-bold text-xs">
            Book By Bag / Pound
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto animate-in fade-in duration-200">
      {plans.map((pkg, idx) => {
        const isFeatured = idx === 1;
        const savings = Math.max(0, pkg.original_price - pkg.discounted_price);

        return (
          <div
            key={pkg.id}
            className={`bg-white rounded-3xl p-6 flex flex-col justify-between relative ${
              isFeatured ? "border-2 border-sky-500 shadow-xl" : "border border-slate-200 shadow-md"
            }`}
          >
            {isFeatured && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sky-600 text-white text-[10px] font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider">
                Best Family Value
              </div>
            )}
            <div>
              {savings > 0 && (
                <Badge variant={isFeatured ? "success" : "secondary"} className="mb-3">
                  Save ${savings.toFixed(2)}
                </Badge>
              )}
              <h3 className="text-xl font-black text-slate-900">{pkg.name}</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">{pkg.description}</p>
              <div className="mb-4">
                <span className="text-3xl font-black text-slate-900">${pkg.discounted_price.toFixed(2)}</span>
                {pkg.original_price > pkg.discounted_price && (
                  <span className="text-xs text-slate-400 line-through ml-2">${pkg.original_price.toFixed(2)}</span>
                )}
              </div>
              <ul className="space-y-2 text-xs text-slate-600">
                {(pkg.key_points || ["Free delivery on all loads", "Never expires"]).map((pt, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Link href={`/order?mode=package&package=${pkg.id}`} className="mt-6 block">
              <Button variant={isFeatured ? "hero" : "outline"} className="w-full">
                Book This Package
              </Button>
            </Link>
          </div>
        );
      })}
    </div>
  );
}

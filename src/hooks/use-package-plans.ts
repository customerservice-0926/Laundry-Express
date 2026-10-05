"use client";

import * as React from "react";
import type { PackagePlan } from "@/lib/services/pricing-plan-service";

export function usePackagePlans() {
  const [plans, setPlans] = React.useState<PackagePlan[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/plans", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { plans?: PackagePlan[] }) => {
        if (!cancelled) setPlans((data.plans ?? []).filter((p) => p.is_active && p.capacity > 0 && p.discounted_price > 0));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { plans, isLoading };
}

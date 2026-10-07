"use client";

import * as React from "react";
import { PricingSettingsForm } from "@/components/admin/settings/pricing-settings-form";
import { ScheduleSettingsForm } from "@/components/admin/settings/schedule-settings-form";
import { CoverageSettingsForm } from "@/components/admin/settings/coverage-settings-form";
import type { BusinessSettings } from "@/lib/services/content-service";
import type { PricingConfig } from "@/lib/services/pricing-plan-service";

interface SettingsData {
  pricing: PricingConfig | null;
  settings: BusinessSettings | null;
}

export function AdminSettingsManager() {
  const [data, setData] = React.useState<SettingsData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState("");

  React.useEffect(() => {
    let disposed = false;
    Promise.all([
      fetch("/api/pricing", { cache: "no-store" }),
      fetch("/api/content?type=settings", { cache: "no-store" }),
    ]).then(async ([pricingResponse, settingsResponse]) => {
      const pricingResult = await pricingResponse.json();
      const settingsResult = await settingsResponse.json();
      if (!pricingResponse.ok || !pricingResult.success) {
        throw new Error(pricingResult.error || "Unable to load pricing settings.");
      }
      if (!settingsResponse.ok || !settingsResult.success) {
        throw new Error(settingsResult.error || "Unable to load business settings.");
      }
      if (!disposed) setData({ pricing: pricingResult.pricing ?? null, settings: settingsResult.settings });
    }).catch((error: unknown) => {
      if (!disposed) setLoadError(error instanceof Error ? error.message : "Unable to load settings.");
    }).finally(() => {
      if (!disposed) setIsLoading(false);
    });
    return () => { disposed = true; };
  }, []);

  const refreshSettings = React.useCallback(async () => {
    try {
      const res = await fetch("/api/content?type=settings", { cache: "no-store" });
      const json = await res.json();
      if (res.ok && json.success) {
        setData((prev) => (prev ? { ...prev, settings: json.settings } : prev));
      }
    } catch {
      // no-op
    }
  }, []);

  if (isLoading) return <p className="rounded-xl border bg-white p-6 text-sm text-slate-600">Loading saved settings...</p>;
  if (loadError || !data) {
    return <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
      {loadError || "Settings are unavailable."}
    </p>;
  }

  return (
    <div className="space-y-6">
      <PricingSettingsForm initialPricing={data.pricing} />
      <ScheduleSettingsForm initialSettings={data.settings} onSaved={refreshSettings} />
      <CoverageSettingsForm initialSettings={data.settings} />
    </div>
  );
}

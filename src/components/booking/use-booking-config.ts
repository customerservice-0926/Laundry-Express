"use client";

import * as React from "react";
import type { PricingConfig } from "@/types";

interface BookingSettings {
  slot1Start: string;
  slot1End: string;
  slot2Start: string;
  slot2End: string;
  deliveryZones: { city: string; zip: string }[];
}

interface BookingRates {
  bagPrice: number;
  minBags: number;
  maxBags: number;
  poundPrice: number;
  deliveryFee: number;
  freeDeliveryBags: number;
  freeDeliveryLbs: number;
  minLbs: number;
  maxLbs: number;
}

const EMPTY_SETTINGS: BookingSettings = {
  slot1Start: "",
  slot1End: "",
  slot2Start: "",
  slot2End: "",
  deliveryZones: [],
};

export interface ServerTime {
  todayStr: string;
  currentHour: number;
  currentMinute: number;
  timeZone: string;
}

export function useBookingConfig(initialPricing?: Partial<PricingConfig>) {
  const [settings, setSettings] = React.useState(EMPTY_SETTINGS);
  const [serverTime, setServerTime] = React.useState<ServerTime | null>(null);
  const [rates, setRates] = React.useState<BookingRates>({
    bagPrice: Number(initialPricing?.bag_price ?? 0),
    minBags: Number(initialPricing?.min_bags ?? 0),
    maxBags: Number(initialPricing?.max_bags ?? 0),
    poundPrice: Number(initialPricing?.pound_price ?? 0),
    deliveryFee: Number(initialPricing?.standard_delivery_fee ?? 0),
    freeDeliveryBags: Number(initialPricing?.free_delivery_threshold ?? 0),
    freeDeliveryLbs: Number(initialPricing?.free_delivery_lbs ?? 0),
    minLbs: Number(initialPricing?.min_lbs ?? 0),
    maxLbs: Number(initialPricing?.max_lbs ?? 0),
  });
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/pricing", { cache: "no-store" }),
      fetch("/api/content?type=settings", { cache: "no-store" }),
    ]).then(async ([pricingResponse, settingsResponse]) => {
      const pricingData = await pricingResponse.json();
      const settingsData = await settingsResponse.json();
      if (!pricingResponse.ok || !pricingData.pricing) throw new Error("Pricing is not configured yet.");
      if (!settingsResponse.ok || !settingsData.settings) throw new Error("Business hours and service areas are not configured yet.");

      const p = pricingData.pricing;
      const s = settingsData.settings;
      if (settingsData.server_time) {
        setServerTime(settingsData.server_time);
      }
      const rawZones: string[] = Array.isArray(s.delivery_zones) ? s.delivery_zones : [];
      const deliveryZones = rawZones.map((item) => {
        const match = item.match(/^(.+?)\s*\(([0-9]{5})\)$/);
        return match ? { city: match[1].trim(), zip: match[2] } : { city: item, zip: "" };
      });
      if (!s.slot1_start || !s.slot1_end || !s.slot2_start || !s.slot2_end || deliveryZones.length === 0) {
        throw new Error("Business hours, pickup windows, and coverage zones must be configured before orders can be placed.");
      }
      if (cancelled) return;
      setRates({
        bagPrice: Number(p.bag_price), minBags: Number(p.min_bags), maxBags: Number(p.max_bags),
        poundPrice: Number(p.pound_price), deliveryFee: Number(p.standard_delivery_fee),
        freeDeliveryBags: Number(p.free_delivery_threshold), freeDeliveryLbs: Number(p.free_delivery_lbs),
        minLbs: Number(p.min_lbs), maxLbs: Number(p.max_lbs),
      });
      setSettings({
        slot1Start: s.slot1_start,
        slot1End: s.slot1_end,
        slot2Start: s.slot2_start,
        slot2End: s.slot2_end,
        deliveryZones,
      });
    }).catch((cause: unknown) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : "Unable to load order settings.");
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return { settings, rates, serverTime, isLoading, error };
}

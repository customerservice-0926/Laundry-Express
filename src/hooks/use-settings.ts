"use client";

import * as React from "react";
import { fmt12h } from "@/lib/utils";

export interface SlotSettings {
  slot1Start: string;
  slot1End: string;
  slot2Start: string;
  slot2End: string;
  operatingHours: string;
}

const EMPTY: SlotSettings = {
  slot1Start: "",
  slot1End: "",
  slot2Start: "",
  slot2End: "",
  operatingHours: "",
};

export function useSettings(): SlotSettings {
  const [settings, setSettings] = React.useState<SlotSettings>(EMPTY);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/content?type=settings", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load business settings.");
        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        const s = data?.settings;
        if (!s) return;
        const slot1Start = s.slot1_start || "";
        const slot1End = s.slot1_end || "";
        const slot2Start = s.slot2_start || "";
        const slot2End = s.slot2_end || "";
        setSettings({
          slot1Start,
          slot1End,
          slot2Start,
          slot2End,
          operatingHours: s.operating_hours || (slot1Start && slot2End ? `${fmt12h(slot1Start)} – ${fmt12h(slot2End)}` : ""),
        });
      })
      .catch(() => {
        if (!cancelled) setSettings(EMPTY);
      });
    return () => { cancelled = true; };
  }, []);

  return settings;
}

/** Format slot 1 label (morning window) from live settings */
export function useSlot1Label(s: SlotSettings) {
  return s.slot1Start && s.slot1End ? `${fmt12h(s.slot1Start)} – ${fmt12h(s.slot1End)}` : "Pickup window not configured";
}

/** Format slot 2 label (afternoon window) from live settings */
export function useSlot2Label(s: SlotSettings) {
  return s.slot2Start && s.slot2End ? `${fmt12h(s.slot2Start)} – ${fmt12h(s.slot2End)}` : "Pickup window not configured";
}

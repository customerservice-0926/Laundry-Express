import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ContentService } from "@/lib/services/content-service";

export interface AvailabilityCheckInput {
  pickup_date: string;
  pickup_slot: string;
  city: string;
  zip_code: string;
}

export function getServiceTimezone(): string {
  if (process.env.SERVICE_TIMEZONE) return process.env.SERVICE_TIMEZONE;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function parseHour(timeStr?: string): number | null {
  if (!timeStr) return null;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  return match ? parseInt(match[1], 10) : null;
}

export function getServiceNow(): { todayStr: string; currentHour: number; currentMinute: number; timeZone: string } {
  const timeZone = getServiceTimezone();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  return {
    todayStr: `${get("year")}-${get("month")}-${get("day")}`,
    currentHour: parseInt(get("hour"), 10) || 0,
    currentMinute: parseInt(get("minute"), 10) || 0,
    timeZone,
  };
}

/**
 * Validates delivery zone coverage, schedule cutoffs, and slot capacity.
 * Enforces business settings and fails closed if settings cannot be verified.
 */
export async function validateOrderAvailability(input: AvailabilityCheckInput): Promise<string | null> {
  // 1. Load operational settings (fail closed on failure)
  let settings;
  try {
    settings = await ContentService.getSettings();
  } catch (error) {
    console.error("Unable to load booking settings.", error);
    return "Service settings are temporarily unavailable. Please try again in a moment.";
  }

  // Enforce service zone coverage
  if (!settings?.delivery_zones || settings.delivery_zones.length === 0) {
    return "Delivery zone configuration is currently being updated. Please try again shortly.";
  }

  const inputZip = input.zip_code.trim();
  const inputCity = input.city.trim().toLowerCase();

  const isCovered = settings.delivery_zones.some((zoneStr) => {
    const match = zoneStr.trim().match(/^(.+?)(?:\s*\(([0-9]{5})\))?$/);
    if (!match) return false;
    const zoneCity = match[1].trim().toLowerCase();
    const zoneZip = match[2]?.trim();
    return zoneZip
      ? zoneZip === inputZip && zoneCity === inputCity
      : zoneCity === inputCity || zoneCity === inputZip;
  });

  if (!isCovered) {
    return `We do not currently service ${input.city} (${input.zip_code}). Please choose a supported delivery area.`;
  }

  // 2. Schedule and Same-Day Cutoff Validation in Service Timezone (America/Chicago)
  const { todayStr, currentHour } = getServiceNow();

  if (input.pickup_date < todayStr) {
    return "Pickup date cannot be in the past.";
  }

  if (input.pickup_date === todayStr) {
    let cutoffHour = 12;
    if (input.pickup_slot === "8am-12pm") {
      cutoffHour = parseHour(settings.slot1_end) ?? 12;
    } else if (input.pickup_slot === "1pm-6pm") {
      cutoffHour = parseHour(settings.slot2_end) ?? 18;
    }

    if (currentHour >= cutoffHour) {
      return `The ${input.pickup_slot} pickup window for today is closed. Please choose a future date or window.`;
    }
  }

  // 3. Slot Capacity Validation (fail closed on database error)
  const slotCapacity = settings.max_orders_per_slot;
  if (typeof slotCapacity !== "number" || !Number.isInteger(slotCapacity) || slotCapacity < 1) {
    return "Pickup capacity is not configured. Please contact support.";
  }

  const supabase = createAdminSupabaseClient();
  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("pickup_date", input.pickup_date)
    .eq("pickup_time_slot", input.pickup_slot)
    .neq("order_status", "cancelled");

  if (error) {
    return "Unable to verify slot availability at this time. Please try again shortly.";
  }

  if (typeof count === "number" && count >= slotCapacity) {
    return `The selected pickup window is fully booked for ${input.pickup_date}. Please choose another slot.`;
  }

  return null;
}

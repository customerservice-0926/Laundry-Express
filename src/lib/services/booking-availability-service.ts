import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ContentService } from "@/lib/services/content-service";

export interface AvailabilityCheckInput {
  pickup_date: string;
  pickup_slot: string;
  city: string;
  zip_code: string;
  delivery_date?: string;
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
 * Validates delivery zone coverage, operating schedule, closed dates, cutoffs, and slot capacity.
 * Enforces business settings strictly and fails closed if settings cannot be verified.
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

  // 2. Pickup Date Normalization & Strict Format Validation
  const pickupDate = input.pickup_date?.trim();
  if (!pickupDate || !/^\d{4}-\d{2}-\d{2}$/.test(pickupDate)) {
    return "Please enter a valid pickup date (YYYY-MM-DD).";
  }

  const { todayStr, currentHour } = getServiceNow();
  if (pickupDate < todayStr) {
    return "Pickup date cannot be in the past.";
  }

  // Weekly Operating Days Validation
  const operatingDays = Array.isArray(settings.operating_days) ? settings.operating_days : [];
  const formattedDays = operatingDays
    .map((name) => name.charAt(0).toUpperCase() + name.slice(1))
    .join(", ");

  const [y, m, d] = pickupDate.split("-").map(Number);
  const pickupDateObj = new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0));
  const dayNameLower = pickupDateObj.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }).toLowerCase();
  const dayNameFull = pickupDateObj.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });

  if (!operatingDays.includes(dayNameLower)) {
    return `Laundry pickup is closed on ${dayNameFull}s. We operate on: ${formattedDays}.`;
  }

  // Scheduled Closure Dates Validation
  const closedDates = Array.isArray(settings.closed_dates)
    ? settings.closed_dates.map((item) => String(item).trim())
    : [];

  if (closedDates.includes(pickupDate)) {
    return `Laundry pickup is closed on ${pickupDate} for a scheduled closure. Please choose an open date.`;
  }

  // Optional Drop-off / Delivery Date Validation
  if (input.delivery_date) {
    const deliveryDate = input.delivery_date.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate)) {
      return "Please enter a valid delivery date (YYYY-MM-DD).";
    }
    if (deliveryDate < pickupDate) {
      return "Drop-off date cannot be earlier than pickup date.";
    }
    if (closedDates.includes(deliveryDate)) {
      return `Laundry delivery is closed on ${deliveryDate} for a scheduled closure. Please choose an open date.`;
    }
    const [dy, dm, dd] = deliveryDate.split("-").map(Number);
    const dropoffObj = new Date(Date.UTC(dy, (dm || 1) - 1, dd || 1, 12, 0, 0));
    const dropoffDayLower = dropoffObj.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }).toLowerCase();
    const dropoffDayFull = dropoffObj.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
    if (!operatingDays.includes(dropoffDayLower)) {
      return `Laundry delivery is closed on ${dropoffDayFull}s. We operate on: ${formattedDays}.`;
    }
  }

  // Same-Day Pickup Window Cutoff Validation
  if (pickupDate === todayStr) {
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
    .eq("pickup_date", pickupDate)
    .eq("pickup_time_slot", input.pickup_slot)
    .neq("order_status", "cancelled");

  if (error) {
    return "Unable to verify slot availability at this time. Please try again shortly.";
  }

  if (typeof count === "number" && count >= slotCapacity) {
    return `The selected pickup window is fully booked for ${pickupDate}. Please choose another slot.`;
  }

  return null;
}

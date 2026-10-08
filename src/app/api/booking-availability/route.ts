import { NextResponse, type NextRequest } from "next/server";
import { ContentService } from "@/lib/services/content-service";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getServiceNow } from "@/lib/services/booking-availability-service";

function parseHour(timeStr?: string): number {
  if (!timeStr) return 0;
  const [h] = timeStr.split(":").map(Number);
  return Number.isFinite(h) ? h : 0;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const dateParam = searchParams.get("date")?.trim();
    const dropoffParam = searchParams.get("dropoff")?.trim();

    const settings = await ContentService.getSettings();
    const serverTime = getServiceNow();
    const todayStr = serverTime.todayStr;
    const currentHour = serverTime.currentHour;

    const operatingDays = Array.isArray(settings?.operating_days) ? settings.operating_days : [];
    const closedDates = Array.isArray(settings?.closed_dates)
      ? settings.closed_dates.map((d) => String(d).trim())
      : [];
    const capacity = typeof settings?.max_orders_per_slot === "number" ? settings.max_orders_per_slot : 15;

    const targetDate = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : todayStr;

    // Check date validity
    const isPastDate = targetDate < todayStr;
    const [y, m, d] = targetDate.split("-").map(Number);
    const dateObj = new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0));
    const dayNameLower = dateObj.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }).toLowerCase();
    const dayNameFull = dateObj.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
    const isOperatingDay = operatingDays.includes(dayNameLower);
    const isHolidayClosed = closedDates.includes(targetDate);

    let dateError: string | null = null;
    if (isPastDate) {
      dateError = "Pickup date cannot be in the past.";
    } else if (!isOperatingDay) {
      dateError = `Laundry pickup is closed on ${dayNameFull}s.`;
    } else if (isHolidayClosed) {
      dateError = `Laundry pickup is closed on ${targetDate} for a scheduled closure.`;
    }

    // Query booked orders count for this date
    const supabase = createAdminSupabaseClient();
    const { data: slotOrders } = await supabase
      .from("orders")
      .select("pickup_time_slot")
      .eq("pickup_date", targetDate)
      .neq("order_status", "cancelled");

    const countSlot1 = slotOrders?.filter((o) => o.pickup_time_slot === "8am-12pm").length || 0;
    const countSlot2 = slotOrders?.filter((o) => o.pickup_time_slot === "1pm-6pm").length || 0;

    const slot1EndHour = parseHour(settings?.slot1_end) || 12;
    const slot2EndHour = parseHour(settings?.slot2_end) || 18;

    const isSlot1Past = targetDate === todayStr && currentHour >= slot1EndHour;
    const isSlot2Past = targetDate === todayStr && currentHour >= slot2EndHour;

    const isSlot1Full = countSlot1 >= capacity;
    const isSlot2Full = countSlot2 >= capacity;

    const isDateAvailable = !dateError;

    const slot1Available = isDateAvailable && !isSlot1Past && !isSlot1Full;
    const slot2Available = isDateAvailable && !isSlot2Past && !isSlot2Full;

    const slot1Reason = isSlot1Past
      ? "Window has passed for today"
      : isSlot1Full
      ? "Pickup window is fully booked"
      : dateError;

    const slot2Reason = isSlot2Past
      ? "Window has passed for today"
      : isSlot2Full
      ? "Pickup window is fully booked"
      : dateError;

    // Optional Dropoff Validation
    let dropoffValid = true;
    let dropoffError: string | null = null;

    if (dropoffParam && /^\d{4}-\d{2}-\d{2}$/.test(dropoffParam)) {
      if (dropoffParam < targetDate) {
        dropoffValid = false;
        dropoffError = "Drop-off date cannot be earlier than pickup date.";
      } else if (closedDates.includes(dropoffParam)) {
        dropoffValid = false;
        dropoffError = `Delivery is closed on ${dropoffParam} for a scheduled closure.`;
      } else {
        const [dy, dm, dd] = dropoffParam.split("-").map(Number);
        const dropObj = new Date(Date.UTC(dy, (dm || 1) - 1, dd || 1, 12, 0, 0));
        const dropDayLower = dropObj.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }).toLowerCase();
        const dropDayFull = dropObj.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
        if (!operatingDays.includes(dropDayLower)) {
          dropoffValid = false;
          dropoffError = `Delivery is closed on ${dropDayFull}s.`;
        }
      }
    }

    return NextResponse.json({
      success: true,
      targetDate,
      isDateAvailable,
      dateError,
      serverTime,
      slots: {
        "8am-12pm": {
          available: slot1Available,
          isPastCutoff: isSlot1Past,
          isFullyBooked: isSlot1Full,
          bookedCount: countSlot1,
          capacity,
          remaining: Math.max(0, capacity - countSlot1),
          reason: slot1Reason,
        },
        "1pm-6pm": {
          available: slot2Available,
          isPastCutoff: isSlot2Past,
          isFullyBooked: isSlot2Full,
          bookedCount: countSlot2,
          capacity,
          remaining: Math.max(0, capacity - countSlot2),
          reason: slot2Reason,
        },
      },
      dropoff: {
        valid: dropoffValid,
        error: dropoffError,
      },
    });
  } catch (error) {
    console.error("[api/booking-availability GET] Error:", error);
    return NextResponse.json({ success: false, error: "Unable to verify slot availability." }, { status: 500 });
  }
}

"use client";

import * as React from "react";
import { Calendar as CalendarIcon, Clock, CheckCircle, Truck, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSlotAvailability } from "@/hooks/use-slot-availability";

interface StepSlotPickerProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  selectedSlot: "8am-12pm" | "1pm-6pm";
  onSelectSlot: (slot: "8am-12pm" | "1pm-6pm") => void;
  dropoffDate?: string;
  onSelectDropoffDate?: (date: string) => void;
  slot1Start: string;
  slot1End: string;
  slot2Start: string;
  slot2End: string;
  operatingDays?: string[];
  closedDates?: string[];
  serverTime?: {
    todayStr: string;
    currentHour: number;
    currentMinute: number;
    timeZone: string;
  } | null;
  onSlotAvailabilityChange?: (isAvailable: boolean, errorReason?: string | null) => void;
}

const fmt12 = (t?: string): string => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${m === 0 ? "00" : String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

export function StepSlotPicker({
  selectedDate, onSelectDate, selectedSlot, onSelectSlot, dropoffDate = "", onSelectDropoffDate,
  slot1Start, slot1End, slot2Start, slot2End, operatingDays = [], closedDates = [], serverTime, onSlotAvailabilityChange,
}: StepSlotPickerProps) {
  const todayStr = serverTime?.todayStr || new Date().toISOString().split("T")[0];
  const nowHour = serverTime?.currentHour ?? new Date().getHours();
  const availability = useSlotAvailability(selectedDate, dropoffDate, todayStr);
  const { slots: slotMap, isDateAvailable, dateError, dropoff, isLoading } = availability;
  const slot1 = slotMap["8am-12pm"];
  const slot2 = slotMap["1pm-6pm"];

  const availableDates = React.useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const [y, m, d] = todayStr.split("-").map(Number);
      const dateObj = new Date(y || new Date().getFullYear(), (m || 1) - 1, (d || 1) + i);
      const iso = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
      const dayName = i === 0 ? "Today" : i === 1 ? "Tomorrow" : dateObj.toLocaleDateString("en-US", { weekday: "short" });
      const monthDay = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const dayOfWeek = dateObj.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
      const isOperatingDay = operatingDays.includes(dayOfWeek);
      const isHolidayClosed = closedDates.includes(iso);
      const isPastToday = i === 0 && nowHour >= parseInt(slot2End?.split(":")[0] || "18", 10);
      return {
        isoDate: iso, dayName, monthDay, isDateDisabled: !isOperatingDay || isHolidayClosed || isPastToday,
        badge: isHolidayClosed ? "Holiday" : !isOperatingDay ? "Off" : isPastToday ? "Closed" : null,
      };
    });
  }, [todayStr, nowHour, slot2End, operatingDays, closedDates]);

  React.useEffect(() => {
    if (!selectedDate && availableDates.length > 0) {
      const firstOpen = availableDates.find((d) => !d.isDateDisabled);
      if (firstOpen) onSelectDate(firstOpen.isoDate);
      return;
    }
    if (slot1.available && !slot2.available && selectedSlot === "1pm-6pm") onSelectSlot("8am-12pm");
    else if (!slot1.available && slot2.available && selectedSlot === "8am-12pm") onSelectSlot("1pm-6pm");
  }, [selectedDate, slot1.available, slot2.available, selectedSlot, availableDates, onSelectDate, onSelectSlot]);

  React.useEffect(() => {
    const currentSlotInfo = selectedSlot === "8am-12pm" ? slot1 : slot2;
    const isValid = Boolean(isDateAvailable && currentSlotInfo.available && dropoff.valid);
    const reason = !isDateAvailable ? dateError : !currentSlotInfo.available ? currentSlotInfo.reason || "Pickup window unavailable" : !dropoff.valid ? dropoff.error : null;
    onSlotAvailabilityChange?.(isValid, reason);
  }, [isDateAvailable, dateError, slot1, slot2, selectedSlot, dropoff, onSlotAvailabilityChange]);

  const currentSlotUnavailable = selectedSlot === "8am-12pm" ? !slot1.available : !slot2.available;
  const currentSlotReason = selectedSlot === "8am-12pm" ? slot1.reason : slot2.reason;

  return (
    <div className="space-y-6 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200">
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-primary shrink-0" />
            <h5 className="font-bold text-sm text-slate-900">Step 3: Select Pickup Date</h5>
          </div>
          <input
            type="date"
            min={todayStr}
            value={selectedDate}
            onChange={(e) => onSelectDate(e.target.value)}
            className="w-full sm:w-auto text-xs px-3 py-1.5 rounded-xl border border-slate-300 font-bold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          />
        </div>

        {dateError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{dateError} Please select an open date.</span>
          </div>
        )}

        <div className="grid grid-cols-2 min-[420px]:grid-cols-4 sm:grid-cols-7 gap-2">
          {availableDates.map((item) => {
            const isSelected = selectedDate === item.isoDate;
            return (
              <button
                key={item.isoDate}
                type="button"
                disabled={item.isDateDisabled}
                onClick={() => !item.isDateDisabled && onSelectDate(item.isoDate)}
                className={cn(
                  "p-2.5 rounded-xl border text-center transition-all min-w-0 flex flex-col justify-between items-center",
                  item.isDateDisabled
                    ? "border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60"
                    : isSelected
                    ? "border-primary bg-primary text-white shadow-xs font-bold cursor-pointer"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 cursor-pointer"
                )}
              >
                <span className="block text-xs font-bold truncate">
                  {item.dayName} {item.badge ? `(${item.badge})` : ""}
                </span>
                <span className={cn("block text-[11px] mt-1 truncate", isSelected ? "text-pink-100" : "text-slate-500")}>
                  {item.monthDay}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary shrink-0" />
            <h5 className="font-bold text-sm text-slate-900">Select Pickup Time Window</h5>
          </div>
          {isLoading && <span className="text-[11px] text-slate-400 animate-pulse">Checking slots...</span>}
        </div>

        {currentSlotUnavailable && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900 flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              {currentSlotReason || `The ${selectedSlot} pickup window is not available for this date.`} Please pick an open slot.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {([
            { id: "8am-12pm" as const, label: "Morning Pickup Window", time: `${fmt12(slot1Start)} – ${fmt12(slot1End)}`, info: slot1 },
            { id: "1pm-6pm" as const, label: "Afternoon Pickup Window", time: `${fmt12(slot2Start)} – ${fmt12(slot2End)}`, info: slot2 },
          ]).map(({ id, label, time, info }) => {
            const isSelected = selectedSlot === id;
            const disabled = !info.available;

            return (
              <button
                key={id}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && onSelectSlot(id)}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all flex items-start justify-between min-h-23",
                  disabled
                    ? "border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed"
                    : isSelected
                    ? "border-primary bg-pink-50/50 ring-2 ring-primary/20 shadow-xs cursor-pointer"
                    : "border-slate-200 bg-white hover:border-slate-300 cursor-pointer"
                )}
              >
                <div className="min-w-0 pr-2">
                  <span className="font-extrabold text-sm text-slate-900 block">{time}</span>
                  <span className="text-xs text-slate-500 mt-0.5 block">{label}</span>
                  {disabled ? (
                    <span className="text-[11px] text-rose-600 font-bold block mt-1.5 leading-tight">
                      {info.reason || "Closed / Unavailable"}
                    </span>
                  ) : (
                    <span className="text-[11px] text-emerald-700 font-semibold block mt-1.5">
                      ✓ Available ({info.remaining} slots open)
                    </span>
                  )}
                </div>
                {!disabled && isSelected ? (
                  <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                ) : (
                  <div className="h-5 w-5 rounded-full border border-slate-300 shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-emerald-600 shrink-0" />
            <div>
              <span className="text-xs font-bold text-slate-900 block">Drop-off Date (Optional)</span>
              <span className="text-[11px] text-slate-500">Leave blank and we deliver back within 24 hours.</span>
            </div>
          </div>
          <input
            type="date"
            min={selectedDate || todayStr}
            value={dropoffDate}
            onChange={(e) => onSelectDropoffDate?.(e.target.value)}
            className={cn(
              "w-full sm:w-auto text-xs px-3 py-1.5 rounded-xl border bg-white text-slate-800 focus:outline-none focus:ring-2 font-medium cursor-pointer",
              dropoff.error ? "border-rose-400 focus:ring-rose-400 bg-rose-50/20" : "border-slate-300 focus:ring-primary"
            )}
          />
        </div>

        {dropoff.error && (
          <p className="text-xs text-rose-600 font-semibold flex items-center gap-1.5 pt-1">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{dropoff.error}</span>
          </p>
        )}
      </div>
    </div>
  );
}

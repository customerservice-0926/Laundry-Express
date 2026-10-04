"use client";

import * as React from "react";
import { Calendar as CalendarIcon, Clock, CheckCircle, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimeSlot {
  id: "8am-12pm" | "1pm-6pm";
  label: string;
  time: string;
  startHour: number;
  endHour: number;
}

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
  serverTime?: {
    todayStr: string;
    currentHour: number;
    currentMinute: number;
    timeZone: string;
  } | null;
}

function parseHour(t?: string): number {
  if (!t) return 0;
  const [h] = t.split(":").map(Number);
  return Number.isFinite(h) ? h : 0;
}

function fmt12(t?: string): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12}:00 ${ampm}` : `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function StepSlotPicker({
  selectedDate,
  onSelectDate,
  selectedSlot,
  onSelectSlot,
  dropoffDate = "",
  onSelectDropoffDate,
  slot1Start,
  slot1End,
  slot2Start,
  slot2End,
  serverTime,
}: StepSlotPickerProps) {
  const todayStr = serverTime?.todayStr || new Date().toISOString().split("T")[0];
  const nowHour = serverTime?.currentHour ?? new Date().getHours();
  const isToday = selectedDate === todayStr;

  const slots: TimeSlot[] = [
    {
      id: "8am-12pm",
      label: "Morning Pickup Window",
      time: `${fmt12(slot1Start)} – ${fmt12(slot1End)}`,
      startHour: parseHour(slot1Start) || 8,
      endHour: parseHour(slot1End) || 12,
    },
    {
      id: "1pm-6pm",
      label: "Afternoon Pickup Window",
      time: `${fmt12(slot2Start)} – ${fmt12(slot2End)}`,
      startHour: parseHour(slot2Start) || 13,
      endHour: parseHour(slot2End) || 18,
    },
  ];

  const isSlotDisabled = (slot: TimeSlot) => isToday && nowHour >= slot.endHour;
  const selectedSlotClosed = isToday && slots.some((s) => s.id === selectedSlot && isSlotDisabled(s));

  const availableDates = React.useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const [y, m, d] = todayStr.split("-").map(Number);
      const dateObj = new Date(y || new Date().getFullYear(), (m || 1) - 1, d || new Date().getDate());
      dateObj.setDate(dateObj.getDate() + i);
      const isoYear = dateObj.getFullYear();
      const isoMonth = String(dateObj.getMonth() + 1).padStart(2, "0");
      const isoDay = String(dateObj.getDate()).padStart(2, "0");
      const isoDate = `${isoYear}-${isoMonth}-${isoDay}`;
      const dayName = i === 0 ? "Today" : i === 1 ? "Tomorrow" : dateObj.toLocaleDateString("en-US", { weekday: "short" });
      const monthDay = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const isPastToday = i === 0 && nowHour >= (parseHour(slot2End) || 18);
      return { isoDate, dayName, monthDay, isPastToday };
    });
  }, [todayStr, nowHour, slot2End]);

  React.useEffect(() => {
    if (isToday) {
      const morningClosed = isSlotDisabled(slots[0]);
      const afternoonClosed = isSlotDisabled(slots[1]);
      if (morningClosed && afternoonClosed) {
        const tomorrow = availableDates[1]?.isoDate;
        if (tomorrow && selectedDate === todayStr) {
          onSelectDate(tomorrow);
          onSelectSlot("8am-12pm");
        }
      } else if (morningClosed && !afternoonClosed && selectedSlot === "8am-12pm") {
        onSelectSlot("1pm-6pm");
      }
    }
  }, [selectedDate, isToday, nowHour, todayStr, selectedSlot]);

  return (
    <div className="space-y-6 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200">
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-primary shrink-0" />
            <h5 className="font-bold text-sm text-slate-900">Select Pickup Date</h5>
          </div>
          <input
            type="date"
            min={todayStr}
            value={selectedDate}
            onChange={(e) => onSelectDate(e.target.value)}
            className="w-full sm:w-auto text-xs px-3 py-1.5 rounded-xl border border-slate-300 font-bold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="grid grid-cols-2 min-[420px]:grid-cols-4 sm:grid-cols-7 gap-2">
          {availableDates.map((item) => {
            const isSelected = selectedDate === item.isoDate;
            const isDateDisabled = item.isPastToday;
            return (
              <button
                key={item.isoDate}
                type="button"
                disabled={isDateDisabled}
                onClick={() => !isDateDisabled && onSelectDate(item.isoDate)}
                className={cn(
                  "p-2 rounded-xl border text-center transition-all min-w-0",
                  isDateDisabled
                    ? "border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60"
                    : isSelected
                    ? "border-primary bg-primary text-white shadow-xs font-bold cursor-pointer"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 cursor-pointer"
                )}
              >
                <span className="block text-xs truncate">
                  {item.dayName} {isDateDisabled && "(Closed)"}
                </span>
                <span className={cn("block text-[11px] mt-0.5 truncate", isSelected ? "text-pink-100" : "text-slate-500")}>
                  {item.monthDay}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <h5 className="font-bold text-sm text-slate-900">Select Pickup Time Window</h5>
        </div>
        {selectedSlotClosed && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-rose-600" />
            <span>The {selectedSlot} pickup window for today is closed. Please select an available window or future date.</span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {slots.map((slot) => {
            const isSelected = selectedSlot === slot.id;
            const disabled = isSlotDisabled(slot);
            return (
              <button
                key={slot.id}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && onSelectSlot(slot.id)}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all flex items-start justify-between",
                  disabled
                    ? "border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed"
                    : isSelected
                    ? "border-primary bg-pink-50/50 ring-2 ring-primary/20 shadow-xs cursor-pointer"
                    : "border-slate-200 bg-white hover:border-slate-300 cursor-pointer"
                )}
              >
                <div>
                  <span className="font-extrabold text-sm text-slate-900 block">{slot.time}</span>
                  <span className="text-xs text-slate-500 mt-0.5 block">{slot.label}</span>
                  {disabled && (
                    <span className="text-[11px] text-rose-600 font-bold block mt-1">
                      Closed for today — window has passed
                    </span>
                  )}
                </div>
                {!disabled && isSelected ? (
                  <CheckCircle className="h-5 w-5 text-primary shrink-0 ml-2" />
                ) : (
                  <div className="h-5 w-5 rounded-full border border-slate-300 shrink-0 ml-2" />
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
              <span className="text-[11px] text-slate-500">Leave blank — we deliver within 24 hours.</span>
            </div>
          </div>
          <input
            type="date"
            min={selectedDate || todayStr}
            value={dropoffDate}
            onChange={(e) => onSelectDropoffDate?.(e.target.value)}
            className="w-full sm:w-auto text-xs px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary font-medium"
          />
        </div>
      </div>
    </div>
  );
}

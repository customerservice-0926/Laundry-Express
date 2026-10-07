"use client";

import * as React from "react";
import { CalendarX, ChevronLeft, ChevronRight, X, Trash2, ShieldAlert } from "lucide-react";

export interface ClosedDatesPickerProps {
  closedDates: string[];
  onChange: (dates: string[]) => void;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const toIso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export function ClosedDatesPicker({ closedDates, onChange }: ClosedDatesPickerProps) {
  const [viewDate, setViewDate] = React.useState(() => new Date());

  const now = new Date();
  const todayIso = toIso(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowIso = toIso(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();

  const prevMonth = () => setViewDate(new Date(viewYear, viewMonth - 1, 1));
  const nextMonth = () => setViewDate(new Date(viewYear, viewMonth + 1, 1));

  const toggleDate = (iso: string) => {
    if (closedDates.includes(iso)) {
      onChange(closedDates.filter((d) => d !== iso));
    } else {
      onChange([...closedDates, iso].sort());
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 space-y-3.5">
      {/* Header and Quick 1-Day Closure Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-800">
          <CalendarX className="h-4 w-4 text-rose-500 shrink-0" />
          <span>Scheduled Closure Dates (Customer Blocking)</span>
          {closedDates.length > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black">
              {closedDates.length} blocked
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => toggleDate(todayIso)}
            className={`text-[11px] px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer ${
              closedDates.includes(todayIso)
                ? "bg-rose-500 text-white border-rose-500 shadow-2xs"
                : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
            }`}
          >
            {closedDates.includes(todayIso) ? "✓ Today Closed" : "+ Close Today"}
          </button>
          <button
            type="button"
            onClick={() => toggleDate(tomorrowIso)}
            className={`text-[11px] px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer ${
              closedDates.includes(tomorrowIso)
                ? "bg-rose-500 text-white border-rose-500 shadow-2xs"
                : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
            }`}
          >
            {closedDates.includes(tomorrowIso) ? "✓ Tomorrow Closed" : "+ Close Tomorrow"}
          </button>
          {closedDates.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[11px] text-rose-600 hover:text-rose-800 font-bold cursor-pointer inline-flex items-center gap-1 ml-1"
            >
              <Trash2 className="h-3 w-3" /> Clear All
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-3.5 items-start">
        {/* Dynamic Interactive Calendar */}
        <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-800">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                aria-label="Previous month"
                className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                aria-label="Next month"
                className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 cursor-pointer"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
            {WEEKDAY_NAMES.map((w) => (
              <span key={w} className="font-bold text-slate-400 py-0.5">{w}</span>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => (
              <span key={`empty-${i}`} className="p-1" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const iso = toIso(viewYear, viewMonth, day);
              const isClosed = closedDates.includes(iso);
              const isPast = iso < todayIso;
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={isPast}
                  onClick={() => toggleDate(iso)}
                  title={`${iso}: ${isClosed ? "Closed (click to open)" : "Open (click to close)"}`}
                  className={`py-1.5 px-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isPast
                      ? "text-slate-300 cursor-not-allowed"
                      : isClosed
                      ? "bg-rose-500 text-white shadow-2xs hover:bg-rose-600"
                      : "bg-white border border-slate-200 text-slate-700 hover:border-slate-400"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-400 italic">
            Click any calendar day to toggle closed/open. Marked dates cannot be booked by customers.
          </p>
        </div>

        {/* Active Blocked Dates & Customer Impact Info */}
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200/90 bg-white p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="block text-[11px] font-bold text-slate-700">
                Active Closure Dates ({closedDates.length})
              </span>
              {closedDates.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-[10px] text-rose-600 hover:underline font-semibold cursor-pointer"
                >
                  Remove all
                </button>
              )}
            </div>
            {closedDates.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                {closedDates.map((d) => {
                  const [y, m, day] = d.split("-").map(Number);
                  const label = new Date(Date.UTC(y, (m || 1) - 1, day || 1, 12)).toLocaleDateString("en-US", {
                    weekday: "short", month: "short", day: "numeric", timeZone: "UTC",
                  });
                  return (
                    <span
                      key={d}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold"
                    >
                      {label}
                      <button
                        type="button"
                        onClick={() => toggleDate(d)}
                        className="text-rose-400 hover:text-rose-700 cursor-pointer p-0.5"
                        title={`Re-open ${d}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic py-2">
                No extra closure dates scheduled. Click dates on the calendar to close specific days.
              </p>
            )}
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span>
              <strong>Customer Impact:</strong> Any closed date marked here is immediately blocked across the customer booking wizard and rejected by the order validation engine.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

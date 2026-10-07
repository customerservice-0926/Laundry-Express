"use client";

import * as React from "react";
import { Clock } from "lucide-react";

export function TimeWindow({
  title,
  start,
  end,
  onStart,
  onEnd,
  icon,
}: {
  title: string;
  start: string;
  end: string;
  onStart: (value: string) => void;
  onEnd: (value: string) => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 space-y-3">
      <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
        {icon || <Clock className="h-4 w-4 text-primary shrink-0" />}
        <span className="text-xs font-bold text-slate-800">{title}</span>
      </div>
      <div className="space-y-3">
        <TimePicker label="Start time" value={start} onChange={onStart} />
        <TimePicker label="End time" value={end} onChange={onEnd} />
      </div>
    </div>
  );
}

export function TimePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [hour = "08", minute = "00"] = value.split(":");
  const hour24 = Number(hour);
  const isPm = hour24 >= 12;
  const displayHour = hour24 % 12 || 12;

  const updateTime = (nextHour: number, nextMinute: number, pm: boolean) => {
    const normalizedHour = (nextHour % 12) + (pm ? 12 : 0);
    onChange(`${String(normalizedHour).padStart(2, "0")}:${String(nextMinute).padStart(2, "0")}`);
  };

  const selectClass =
    "w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm font-semibold text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

  return (
    <div className="space-y-1.5">
      <span className="block text-[11px] font-medium text-slate-500">{label}</span>
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        <select
          aria-label={`${label} hour`}
          className={selectClass}
          value={displayHour}
          onChange={(event) => updateTime(Number(event.target.value), Number(minute), isPm)}
        >
          {Array.from({ length: 12 }, (_, index) => index + 1).map((hourOption) => (
            <option key={hourOption} value={hourOption}>
              {hourOption}
            </option>
          ))}
        </select>
        <select
          aria-label={`${label} minute`}
          className={selectClass}
          value={minute}
          onChange={(event) => updateTime(displayHour, Number(event.target.value), isPm)}
        >
          {Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0")).map(
            (minuteOption) => (
              <option key={minuteOption} value={minuteOption}>
                {minuteOption}
              </option>
            )
          )}
        </select>
        <select
          aria-label={`${label} AM or PM`}
          className={selectClass}
          value={isPm ? "PM" : "AM"}
          onChange={(event) => updateTime(displayHour, Number(minute), event.target.value === "PM")}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
}

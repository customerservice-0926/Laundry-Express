"use client";

import * as React from "react";
import { Clock, Save, Sun, Sunset, Calendar, Layers } from "lucide-react";
import { SaveSettingsForm, useSettingsSave, postSettings } from "./save-settings-form";
import { TimeWindow } from "./time-window-picker";
import { ClosedDatesPicker } from "./closed-dates-picker";
import { Button } from "@/components/ui/button";
import type { BusinessSettings } from "@/lib/services/content-service";

const WEEKDAYS = [
  { id: "monday", label: "Mon", full: "Monday" },
  { id: "tuesday", label: "Tue", full: "Tuesday" },
  { id: "wednesday", label: "Wed", full: "Wednesday" },
  { id: "thursday", label: "Thu", full: "Thursday" },
  { id: "friday", label: "Fri", full: "Friday" },
  { id: "saturday", label: "Sat", full: "Saturday" },
  { id: "sunday", label: "Sun", full: "Sunday" },
];

export function ScheduleSettingsForm({
  initialSettings,
  onSaved,
}: {
  initialSettings: BusinessSettings | null;
  onSaved?: () => void;
}) {
  const [operatingDays, setOperatingDays] = React.useState<string[]>(() => {
    return Array.isArray(initialSettings?.operating_days) && initialSettings.operating_days.length > 0
      ? initialSettings.operating_days
      : ["monday", "tuesday", "wednesday", "thursday", "friday"];
  });
  const [closedDates, setClosedDates] = React.useState<string[]>(() => {
    return Array.isArray(initialSettings?.closed_dates) ? initialSettings.closed_dates : [];
  });
  const [operatingHours, setOperatingHours] = React.useState(initialSettings?.operating_hours || "");
  const [slot1Start, setSlot1Start] = React.useState(initialSettings?.slot1_start || "08:00");
  const [slot1End, setSlot1End] = React.useState(initialSettings?.slot1_end || "12:00");
  const [slot2Start, setSlot2Start] = React.useState(initialSettings?.slot2_start || "13:00");
  const [slot2End, setSlot2End] = React.useState(initialSettings?.slot2_end || "18:00");
  const [maxOrdersPerSlot, setMaxOrdersPerSlot] = React.useState<number | string>(
    initialSettings?.max_orders_per_slot ?? 10
  );
  const { isSaving, error, saved, save } = useSettingsSave();

  React.useEffect(() => {
    if (initialSettings) {
      if (Array.isArray(initialSettings.operating_days) && initialSettings.operating_days.length > 0) {
        setOperatingDays(initialSettings.operating_days);
      }
      if (Array.isArray(initialSettings.closed_dates)) {
        setClosedDates(initialSettings.closed_dates);
      }
      if (initialSettings.operating_hours) setOperatingHours(initialSettings.operating_hours);
      if (initialSettings.slot1_start) setSlot1Start(initialSettings.slot1_start);
      if (initialSettings.slot1_end) setSlot1End(initialSettings.slot1_end);
      if (initialSettings.slot2_start) setSlot2Start(initialSettings.slot2_start);
      if (initialSettings.slot2_end) setSlot2End(initialSettings.slot2_end);
      if (initialSettings.max_orders_per_slot) setMaxOrdersPerSlot(initialSettings.max_orders_per_slot);
    }
  }, [initialSettings]);

  const toggleDay = (dayId: string) => {
    setOperatingDays((prev) => {
      return prev.includes(dayId)
        ? prev.length > 1 ? prev.filter((d) => d !== dayId) : prev
        : [...prev, dayId];
    });
  };

  const setMonToFri = () => {
    setOperatingDays(["monday", "tuesday", "wednesday", "thursday", "friday"]);
  };

  const setAllDays = () => {
    setOperatingDays(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void save(async () => {
      await postSettings({
        operating_hours: operatingHours,
        operating_days: operatingDays,
        closed_dates: closedDates,
        slot1_start: slot1Start, slot1_end: slot1End,
        slot2_start: slot2Start, slot2_end: slot2End,
        max_orders_per_slot: Number(maxOrdersPerSlot) || 10,
      });
      onSaved?.();
    });
  };

  const closedDays = WEEKDAYS.filter((d) => !operatingDays.includes(d.id));

  return (
    <SaveSettingsForm title="Business Hours & Off Days" description="Set weekly operating schedule, pickup windows, and additional closure dates."
      isLoading={false} isSaving={isSaving} error={error} saved={saved} onSubmit={handleSubmit}>
      <section className="p-3.5 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
        {/* Weekly Header & Quick Presets */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <h4 className="flex items-center gap-2 text-slate-900 font-black text-xs uppercase tracking-wider">
            <Clock className="h-4 w-4 text-primary shrink-0" /> Weekly Schedule &amp; Operating Windows
          </h4>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={setMonToFri}
              className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:border-primary hover:text-primary transition-colors cursor-pointer text-center"
            >
              Mon – Fri
            </button>
            <button
              type="button"
              onClick={setAllDays}
              className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:border-primary hover:text-primary transition-colors cursor-pointer text-center"
            >
              All 7 Days
            </button>
          </div>
        </div>

        {/* Operating Days Toggle Row */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs">
            <span className="font-bold text-slate-700">Weekly Operating Days</span>
            <span className="text-[11px] text-slate-500 font-medium">
              {closedDays.length === 0 ? "Open 7 days a week" : `Closed weekly on: ${closedDays.map((d) => d.full).join(", ")}`}
            </span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 sm:gap-2">
            {WEEKDAYS.map((day) => {
              const active = operatingDays.includes(day.id);
              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => toggleDay(day.id)}
                  className={`py-2 px-1 text-center rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? "bg-primary border-primary text-white shadow-2xs"
                      : "bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300"
                  }`}
                  title={`${day.full}: ${active ? "Open" : "Closed"}`}
                >
                  <span className="block">{day.label}</span>
                  <span className={`block text-[10px] mt-0.5 ${active ? "text-pink-100" : "text-slate-400"}`}>
                    {active ? "Open" : "Off"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Multi-date & Date Range Off Days Picker */}
        <ClosedDatesPicker closedDates={closedDates} onChange={setClosedDates} />

        {/* Pickup Windows: 2-column balanced cards with title padding & icons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-xs">
          <TimeWindow
            title="Morning Pickup Window"
            icon={<Sun className="h-4 w-4 text-amber-500 shrink-0" />}
            start={slot1Start}
            end={slot1End}
            onStart={setSlot1Start}
            onEnd={setSlot1End}
          />
          <TimeWindow
            title="Afternoon Pickup Window"
            icon={<Sunset className="h-4 w-4 text-orange-500 shrink-0" />}
            start={slot2Start}
            end={slot2End}
            onStart={setSlot2Start}
            onEnd={setSlot2End}
          />
        </div>

        {/* Schedule Summary & Slot Capacity: 2-column compact cards without awkward height stretching */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-xs">
          <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 space-y-2">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
              <Calendar className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs font-bold text-slate-800">Hours Summary Note</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Customer-facing operational badge displayed across website headers and banners.
            </p>
            <input
              required
              type="text"
              value={operatingHours}
              onChange={(e) => setOperatingHours(e.target.value)}
              placeholder="e.g. Monday - Friday, 8:00 AM - 6:00 PM"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 space-y-2">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
              <Layers className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs font-bold text-slate-800">Orders Per Pickup Window</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Maximum concurrent customer bookings allowed per time window before marking full.
            </p>
            <div className="flex items-center gap-2.5 pt-0.5">
              <input
                required
                type="number"
                min="1"
                step="1"
                value={maxOrdersPerSlot}
                onChange={(e) => setMaxOrdersPerSlot(e.target.value)}
                className="w-28 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <span className="text-[11px] font-semibold text-slate-600">orders per window</span>
            </div>
          </div>
        </div>

        {/* Bottom Save Action Bar */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200/80">
          <p className="text-[11px] text-slate-500">
            Changes apply instantly to live customer booking calendars upon saving.
          </p>
          <Button type="submit" variant="hero" size="sm" disabled={isSaving} className="w-full sm:w-auto cursor-pointer text-xs font-bold shrink-0">
            <Save className="h-4 w-4 mr-1.5 shrink-0" />
            <span>{isSaving ? "Saving to Database..." : saved ? "Saved to Database" : "Save Schedule & Off Days"}</span>
          </Button>
        </div>
      </section>
    </SaveSettingsForm>
  );
}

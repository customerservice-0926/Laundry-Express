"use client";

import * as React from "react";
import { User, Phone, Mail, MapPin } from "lucide-react";
import { formatPhoneInput, cn } from "@/lib/utils";
import {
  calculateDeliveryRadius,
  SERVICEABLE_CITIES,
  getDefaultZipForCity,
  getCityForZip,
} from "@/lib/services/geo-radius-service";
import { ManualOrderCustomerPicker } from "./manual-order-customer-picker";
import type { ManualOrderFormState, ManualOrderFieldChange } from "./manual-order-types";

interface Step1Props {
  form: ManualOrderFormState;
  onChange: ManualOrderFieldChange;
}

export function ManualOrderStep1({ form, onChange }: Step1Props) {
  const geo = React.useMemo(() => {
    return calculateDeliveryRadius(form.zip_code, form.city);
  }, [form.zip_code, form.city]);
  const isCovered = geo.isServiceable;

  const handleCitySelect = (selectedCity: string) => {
    onChange("city", selectedCity);
    const defaultZip = getDefaultZipForCity(selectedCity);
    if (defaultZip) onChange("zip_code", defaultZip);
  };

  const handleZipChange = (newZip: string) => {
    const cleaned = newZip.replace(/\D/g, "").slice(0, 5);
    onChange("zip_code", cleaned);
    if (cleaned.length === 5) {
      const matchedCity = getCityForZip(cleaned);
      if (matchedCity) onChange("city", matchedCity);
    }
  };

  const isCustomCity = form.city && !SERVICEABLE_CITIES.some((c) => c.city.toLowerCase() === form.city.toLowerCase());

  return (
    <div className="space-y-4 py-1">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
          <User className="h-4 w-4 text-primary" />
          <span>Customer Information</span>
        </div>

        <ManualOrderCustomerPicker
          onSelectCustomer={(fields) => {
            Object.entries(fields).forEach(([k, v]) => onChange(k as keyof ManualOrderFormState, v as ManualOrderFormState[keyof ManualOrderFormState]));
          }}
          currentEmail={form.customer_email}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.customer_name}
              onChange={(e) => onChange("customer_name", e.target.value)}
              placeholder="e.g. Eleanor Vance"
              className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Phone Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Phone className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                required
                value={form.customer_phone}
                onChange={(e) => onChange("customer_phone", formatPhoneInput(e.target.value))}
                placeholder="(815) 555-0199"
                maxLength={14}
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Email Address <span className="text-slate-400 font-normal">(Optional — invoice will be emailed if entered)</span>
          </label>
          <div className="relative">
            <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              value={form.customer_email}
              onChange={(e) => onChange("customer_email", e.target.value)}
              placeholder="customer@email.com"
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
          <MapPin className="h-4 w-4 text-primary" />
          <span>Doorstep Pickup Address</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Street Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.street_address}
              onChange={(e) => onChange("street_address", e.target.value)}
              placeholder="e.g. 742 Evergreen Terrace"
              className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Apt / Suite <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={form.apt_unit}
              onChange={(e) => onChange("apt_unit", e.target.value)}
              placeholder="Apt 4B"
              className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              City (40-Mile Radius) <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={form.city}
              onChange={(e) => handleCitySelect(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            >
              <option value="">Select city...</option>
              {isCustomCity && <option value={form.city}>{form.city} (Selected)</option>}
              <optgroup label="Standard Zone — Free Delivery (0–30 Miles)">
                {SERVICEABLE_CITIES.filter((c) => !c.isExtended).map((c) => (
                  <option key={c.city} value={c.city}>{c.city} (Free)</option>
                ))}
              </optgroup>
              <optgroup label="Extended Service Area — $10 Fee (30–40 Miles)">
                {SERVICEABLE_CITIES.filter((c) => c.isExtended).map((c) => (
                  <option key={c.city} value={c.city}>{c.city} ($10 Fee)</option>
                ))}
              </optgroup>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              State <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              readOnly
              value="IL"
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 cursor-not-allowed text-center uppercase"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Zip Code <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.zip_code}
              onChange={(e) => handleZipChange(e.target.value)}
              placeholder="60156"
              maxLength={5}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition text-center"
            />
          </div>
        </div>

        {form.zip_code.trim().length >= 5 && (
          <div
            className={cn(
              "p-3 rounded-xl border text-xs flex items-center justify-between gap-2 transition-all mt-2",
              !isCovered
                ? "bg-rose-50/80 border-rose-200 text-rose-900"
                : geo.isExtendedArea
                ? "bg-amber-50/80 border-amber-200 text-amber-900"
                : "bg-emerald-50/80 border-emerald-200 text-emerald-900"
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full shrink-0",
                  !isCovered ? "bg-rose-500 ring-2 ring-rose-200" : geo.isExtendedArea ? "bg-amber-500 ring-2 ring-amber-200" : "bg-emerald-500 ring-2 ring-emerald-200"
                )}
              />
              <div>
                <p className="font-bold text-[11px]">
                  {!isCovered
                    ? `Outside 40-Mile Radius (~${geo.distanceMiles} mi)`
                    : geo.isExtendedArea
                    ? `Extended Area (~${geo.distanceMiles} mi) · $10 Delivery Fee`
                    : `Free Delivery Included (~${geo.distanceMiles} mi)`}
                </p>
                <p className="text-[10px] opacity-80">
                  {!isCovered
                    ? "Hub is Lake in the Hills, IL. Service is limited to 40 miles."
                    : geo.isExtendedArea
                    ? "30–40 mile delivery radius includes $10 fee."
                    : "Within 30-mile standard doorstep pickup & delivery zone."}
                </p>
              </div>
            </div>
            <span
              className={cn(
                "text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full shrink-0",
                !isCovered ? "bg-rose-600 text-white" : geo.isExtendedArea ? "bg-amber-600 text-white" : "bg-emerald-600 text-white"
              )}
            >
              {!isCovered ? "Not Covered" : geo.isExtendedArea ? "$10 Fee" : "Free ($0)"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

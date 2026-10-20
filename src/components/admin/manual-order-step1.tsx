"use client";

import * as React from "react";
import { User, Phone, Mail, MapPin } from "lucide-react";
import { formatPhoneInput, cn } from "@/lib/utils";
import type { ManualOrderFormState, ManualOrderFieldChange } from "./manual-order-types";

interface Step1Props {
  form: ManualOrderFormState;
  onChange: ManualOrderFieldChange;
  deliveryZones?: { city: string; zip: string }[];
}

export function ManualOrderStep1({ form, onChange, deliveryZones = [] }: Step1Props) {
  const isCovered = React.useMemo(() => {
    if (!deliveryZones.length) return true;
    const cleanZip = (form.zip_code || "").trim();
    const cleanCity = (form.city || "").trim().toLowerCase();
    return deliveryZones.some((z) => {
      const zZip = (z.zip || "").trim();
      const zCity = (z.city || "").trim().toLowerCase();
      if (zZip && cleanZip) return zZip === cleanZip;
      return zCity === cleanCity;
    });
  }, [deliveryZones, form.zip_code, form.city]);

  return (
    <div className="space-y-4 py-1">
      {/* Customer Identity Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
          <User className="h-4 w-4 text-primary" />
          <span>Customer Information</span>
        </div>

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
            Email Address <span className="text-slate-400 font-normal">(Optional — invoice will be emailed automatically if entered)</span>
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

      {/* Doorstep Address Section */}
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
              City <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.city}
              onChange={(e) => onChange("city", e.target.value)}
              placeholder="Lake in the Hills"
              className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              State <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.state}
              onChange={(e) => onChange("state", e.target.value.toUpperCase())}
              placeholder="IL"
              maxLength={2}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition uppercase"
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
              onChange={(e) => onChange("zip_code", e.target.value.replace(/\D/g, "").slice(0, 5))}
              placeholder="60156"
              maxLength={5}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>
        </div>

        {form.zip_code.trim().length >= 5 && (
          <div
            className={cn(
              "p-3 rounded-xl border text-xs flex items-center justify-between gap-2 transition-all mt-2",
              isCovered
                ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                : "bg-rose-50/80 border-rose-200 text-rose-900"
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full shrink-0",
                  isCovered ? "bg-emerald-500 ring-2 ring-emerald-200" : "bg-rose-500 ring-2 ring-rose-200"
                )}
              />
              <div>
                <p className="font-bold text-[11px]">
                  {isCovered ? "Serviceable Delivery Area" : "Outside Configured Delivery Area"}
                </p>
                <p className="text-[10px] opacity-80">
                  {isCovered
                    ? "Address matches active delivery zone."
                    : `Active zones: ${deliveryZones.map((z) => z.zip ? `${z.city} (${z.zip})` : z.city).join(", ") || "None configured"}`}
                </p>
              </div>
            </div>
            <span
              className={cn(
                "text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full shrink-0",
                isCovered ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
              )}
            >
              {isCovered ? "Serviceable" : "Not Covered"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

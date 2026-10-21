"use client";

import * as React from "react";
import { Check, Loader2, BookmarkPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { User } from "@/types";
import type { UserAddress } from "@/lib/services/address-service";
import {
  calculateDeliveryRadius, SERVICEABLE_CITIES,
  getDefaultZipForCity, getCityForZip,
} from "@/lib/services/geo-radius-service";
import { Button } from "@/components/ui/button";

export interface NewAddressFormProps {
  currentUser?: User | null;
  street: string;
  onStreetChange: (v: string) => void;
  apt: string;
  onAptChange: (v: string) => void;
  city: string;
  onCityChange: (v: string) => void;
  state: string;
  onStateChange: (v: string) => void;
  zip: string;
  onZipChange: (v: string) => void;
  onCityAndZipChange?: (city: string, zip: string) => void;
  showValidationErrors?: boolean;
  onAddressSaved?: (savedAddr: UserAddress) => void;
  hasSavedAddresses?: boolean;
  onCancelAddNew?: () => void;
  editingAddress?: UserAddress | null;
}

export function NewAddressForm({
  currentUser, street, onStreetChange, apt, onAptChange, city, onCityChange,
  state, zip, onZipChange, onCityAndZipChange, showValidationErrors = false,
  onAddressSaved, hasSavedAddresses = false, onCancelAddNew, editingAddress,
}: NewAddressFormProps) {
  const [addressLabel, setAddressLabel] = React.useState(editingAddress?.label || "Home");
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [saveError, setSaveError] = React.useState("");

  const geo = React.useMemo(() => calculateDeliveryRadius(zip, city), [zip, city]);
  const isCovered = geo.isServiceable;
  const isStreetInvalid = showValidationErrors && street.trim().length < 5;
  const isZipInvalid = showValidationErrors && (!/^\d{5}(-\d{4})?$/.test(zip.trim()) || !isCovered);

  const handleCitySelect = (selectedCity: string) => {
    const defaultZip = getDefaultZipForCity(selectedCity);
    if (onCityAndZipChange) onCityAndZipChange(selectedCity, defaultZip || zip);
    else { onCityChange(selectedCity); if (defaultZip) onZipChange(defaultZip); }
  };

  const handleZipChange = (newVal: string) => {
    const cleaned = newVal.replace(/\D/g, "").slice(0, 5);
    const matchedCity = cleaned.length === 5 ? getCityForZip(cleaned) : "";
    if (matchedCity && onCityAndZipChange) onCityAndZipChange(matchedCity, cleaned);
    else { onZipChange(cleaned); if (matchedCity) onCityChange(matchedCity); }
  };

  const handleSaveAddress = async () => {
    if (street.trim().length < 5) return setSaveError("Please enter a complete street address (min 5 characters).");
    if (!/^\d{5}(-\d{4})?$/.test(zip.trim())) return setSaveError("Please enter a valid 5-digit zip code.");
    if (!isCovered) return setSaveError(geo.message || "Address is outside our 40-mile service radius.");
    setSaveError(""); setIsSaving(true);
    try {
      const userId = currentUser?.id || currentUser?.email || "guest-customer";
      const payload = {
        id: editingAddress?.id, user_id: userId, label: addressLabel, street_address: street.trim(),
        apt_unit: apt.trim(), city: city.trim() || geo.city || "Lake in the Hills", state: state || "IL",
        zip_code: zip.trim(), is_default: editingAddress?.is_default ?? (!hasSavedAddresses),
      };
      const res = await fetch("/api/user/addresses", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = await res.json();
      const addrToReturn: UserAddress = (res.ok && data.success && data.address) ? data.address : {
        ...payload, id: editingAddress?.id || `addr-${Date.now()}`, created_at: editingAddress?.created_at || new Date().toISOString(),
      };
      setSaveSuccess(true); setTimeout(() => setSaveSuccess(false), 3000); onAddressSaved?.(addrToReturn);
    } catch {
      setSaveError("Could not save to account. Address will be used for this order.");
    } finally { setIsSaving(false); }
  };

  const isCustomCity = city && !SERVICEABLE_CITIES.some((c) => c.city.toLowerCase() === city.toLowerCase());

  return (
    <div className="space-y-4 pt-1">
      {hasSavedAddresses && (
        <div className="flex items-center justify-between pb-1 text-xs">
          <span className="font-bold text-slate-800">{editingAddress ? `Edit Address (${editingAddress.label || "Home"})` : "Add New Address"}</span>
          {onCancelAddNew && (
            <button type="button" onClick={onCancelAddNew} className="font-semibold text-primary hover:underline cursor-pointer">
              ← {editingAddress ? "Cancel Editing" : "Use Saved Address"}
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Street Number &amp; Name *</label>
          <input
            type="text" required placeholder="e.g. 742 Evergreen Terrace" value={street}
            onChange={(e) => onStreetChange(e.target.value)}
            className={cn("w-full px-3 py-2 rounded-xl border bg-white font-medium focus:ring-2 focus:ring-primary focus:outline-none",
              isStreetInvalid ? "border-rose-500 bg-rose-50/20" : "border-slate-200")}
          />
          {isStreetInvalid && <p className="text-[11px] text-rose-600 mt-1 font-semibold">Please enter your complete street address (minimum 5 characters).</p>}
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Apt / Unit (Optional)</label>
          <input type="text" placeholder="Apt 4B" value={apt} onChange={(e) => onAptChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary focus:outline-none" />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">City (40-Mile Service Area) *</label>
          <select required value={city} onChange={(e) => handleCitySelect(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-primary focus:outline-none text-slate-800 text-xs">
            <option value="">Select your city...</option>
            {isCustomCity && <option value={city}>{city} (Selected)</option>}
            <optgroup label="Standard Zone — Free Delivery (0–30 Miles)">
              {SERVICEABLE_CITIES.filter((c) => !c.isExtended).map((c) => (
                <option key={c.city} value={c.city}>{c.city} (Free Delivery)</option>
              ))}
            </optgroup>
            <optgroup label="Extended Service Area — $10 Fee (30–40 Miles)">
              {SERVICEABLE_CITIES.filter((c) => c.isExtended).map((c) => (
                <option key={c.city} value={c.city}>{c.city} ($10 Delivery Fee)</option>
              ))}
            </optgroup>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">State</label>
          <input type="text" readOnly value="IL" className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-center text-slate-700 cursor-not-allowed" />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Zip Code *</label>
          <input
            type="text" required maxLength={5} value={zip} onChange={(e) => handleZipChange(e.target.value)}
            placeholder="e.g. 60156"
            className={cn("w-full px-3 py-2 rounded-xl border bg-white font-medium text-center focus:ring-2 focus:ring-primary focus:outline-none",
              isZipInvalid ? "border-rose-500 bg-rose-50/20" : "border-slate-200")}
          />
          {isZipInvalid && <p className="text-[11px] text-rose-600 mt-1 font-semibold text-center">{!isCovered ? "Outside 40-mile service radius." : "Valid 5-digit zip required."}</p>}
        </div>
      </div>

      {zip.trim().length >= 5 && (
        <div className={cn("p-3 rounded-xl border text-xs flex items-center justify-between gap-2 transition-all",
          !isCovered ? "bg-rose-50/70 border-rose-200 text-rose-900" : geo.isExtendedArea ? "bg-amber-50/70 border-amber-200 text-amber-900" : "bg-emerald-50/70 border-emerald-200 text-emerald-900")}>
          <div className="flex items-center gap-2">
            <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", !isCovered ? "bg-rose-500 ring-2 ring-rose-200" : geo.isExtendedArea ? "bg-amber-500 ring-2 ring-amber-200" : "bg-emerald-500 ring-2 ring-emerald-200")} />
            <div>
              <p className="font-bold text-[11px]">
                {!isCovered ? `Outside 40-Mile Service Radius (~${geo.distanceMiles} mi)` : geo.isExtendedArea ? `Extended Delivery Area (~${geo.distanceMiles} mi) · $10 Delivery Fee` : `Free Doorstep Delivery (~${geo.distanceMiles} mi)`}
              </p>
              <p className="text-[10px] opacity-85">
                {!isCovered ? "Our facility is in Lake in the Hills, IL. We serve up to a 40-mile radius." : geo.isExtendedArea ? "Addresses between 30 and 40 miles include a $10 fee." : "Your address is within 30 miles of our facility — 100% free delivery included."}
              </p>
            </div>
          </div>
          <span className={cn("text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full shrink-0",
            !isCovered ? "bg-rose-600 text-white" : geo.isExtendedArea ? "bg-amber-600 text-white" : "bg-emerald-600 text-white")}>
            {!isCovered ? "Not Covered" : geo.isExtendedArea ? "$10 Fee" : "Free ($0)"}
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-700 uppercase">Save As:</span>
          <div className="flex gap-1">
            {["Home", "Work", "Other"].map((lbl) => (
              <button key={lbl} type="button" onClick={() => setAddressLabel(lbl)}
                className={cn("px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors",
                  addressLabel === lbl ? "bg-primary text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100")}>
                {lbl}
              </button>
            ))}
          </div>
        </div>

        <Button type="button" size="sm" disabled={isSaving || street.trim().length < 5 || !isCovered} onClick={handleSaveAddress} className="cursor-pointer font-bold shadow-xs flex items-center gap-1.5">
          {isSaving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</> : saveSuccess ? <><Check className="h-3.5 w-3.5 text-emerald-300" /> Saved!</> : <><BookmarkPlus className="h-3.5 w-3.5" /> {editingAddress ? "Update Address" : "Save Address"}</>}
        </Button>
      </div>

      {saveSuccess && <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><Check className="h-3.5 w-3.5" /> {editingAddress ? "Address updated successfully!" : "Address saved successfully!"}</p>}
      {saveError && <p className="text-xs text-rose-500 font-semibold">{saveError}</p>}
    </div>
  );
}

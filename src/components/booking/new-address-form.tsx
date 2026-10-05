"use client";

import * as React from "react";
import { Check, Loader2, BookmarkPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { User } from "@/types";
import type { UserAddress } from "@/lib/services/address-service";
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
  deliveryZones?: { city: string; zip: string }[];
  showValidationErrors?: boolean;
  onAddressSaved?: (savedAddr: UserAddress) => void;
  hasSavedAddresses?: boolean;
  onCancelAddNew?: () => void;
  editingAddress?: UserAddress | null;
}

export function NewAddressForm({
  currentUser,
  street, onStreetChange,
  apt, onAptChange,
  city, onCityChange,
  state, zip, onZipChange,
  deliveryZones = [],
  showValidationErrors = false,
  onAddressSaved,
  hasSavedAddresses = false,
  onCancelAddNew,
  editingAddress,
}: NewAddressFormProps) {
  const [addressLabel, setAddressLabel] = React.useState(editingAddress?.label || "Home");
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [saveError, setSaveError] = React.useState("");

  const isStreetInvalid = showValidationErrors && street.trim().length < 5;
  const isZipInvalid = showValidationErrors && !/^\d{5}(-\d{4})?$/.test(zip.trim());

  const handleSaveAddress = async () => {
    if (street.trim().length < 5) {
      setSaveError("Please enter a complete street address (min 5 characters).");
      return;
    }
    if (!/^\d{5}(-\d{4})?$/.test(zip.trim())) {
      setSaveError("Please enter a valid 5-digit zip code.");
      return;
    }

    setSaveError("");
    setIsSaving(true);

    try {
      const userId = currentUser?.id || currentUser?.email || "guest-customer";
      const res = await fetch("/api/user/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingAddress?.id,
          user_id: userId,
          label: addressLabel,
          street_address: street.trim(),
          apt_unit: apt.trim(),
          city: city.trim(),
          state,
          zip_code: zip.trim(),
          is_default: editingAddress?.is_default ?? (!hasSavedAddresses),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.address) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        onAddressSaved?.(data.address);
      } else {
        const fallbackAddr: UserAddress = {
          id: editingAddress?.id || `addr-${Date.now()}`,
          user_id: userId,
          label: addressLabel,
          street_address: street.trim(),
          apt_unit: apt.trim(),
          city: city.trim(),
          state,
          zip_code: zip.trim(),
          is_default: editingAddress?.is_default ?? (!hasSavedAddresses),
          created_at: editingAddress?.created_at || new Date().toISOString(),
        };
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        onAddressSaved?.(fallbackAddr);
      }
    } catch {
      setSaveError("Could not save to account. Address will be used for this order.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 pt-1">
      {hasSavedAddresses && (
        <div className="flex items-center justify-between pb-1 text-xs">
          <span className="font-bold text-slate-800">
            {editingAddress ? `Edit Address (${editingAddress.label || "Home"})` : "Add New Address"}
          </span>
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
          <input
            type="text" placeholder="Apt 4B" value={apt} onChange={(e) => onAptChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">City *</label>
          {deliveryZones.length > 0 ? (
            <select
              value={city}
              onChange={(e) => {
                const zone = deliveryZones.find((z) => z.city === e.target.value);
                onCityChange(zone ? zone.city : e.target.value);
                if (zone) onZipChange(zone.zip);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-primary focus:outline-none text-slate-800"
            >
              <option value="">Select a service city</option>
              {deliveryZones.map((z) => (<option key={z.zip} value={z.city}>{z.city}</option>))}
            </select>
          ) : (
            <input type="text" required value={city} onChange={(e) => onCityChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-primary focus:outline-none" />
          )}
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">State</label>
          <input type="text" readOnly value="IL" className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-center text-slate-700 cursor-not-allowed" />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Zip Code *</label>
          <input
            type="text" required maxLength={10} value={zip} onChange={(e) => onZipChange(e.target.value)}
            className={cn("w-full px-3 py-2 rounded-xl border bg-white font-medium text-center focus:ring-2 focus:ring-primary focus:outline-none",
              isZipInvalid ? "border-rose-500 bg-rose-50/20" : "border-slate-200")}
          />
          {isZipInvalid && <p className="text-[11px] text-rose-600 mt-1 font-semibold text-center">Valid 5-digit zip required.</p>}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-700 uppercase">Save As:</span>
          <div className="flex gap-1">
            {["Home", "Work", "Other"].map((lbl) => (
              <button
                key={lbl} type="button" onClick={() => setAddressLabel(lbl)}
                className={cn("px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors",
                  addressLabel === lbl ? "bg-primary text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100")}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        <Button
          type="button" size="sm" disabled={isSaving || street.trim().length < 5}
          onClick={handleSaveAddress} className="cursor-pointer font-bold shadow-xs flex items-center gap-1.5"
        >
          {isSaving ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</>
          ) : saveSuccess ? (
            <><Check className="h-3.5 w-3.5 text-emerald-300" /> Saved!</>
          ) : (
            <><BookmarkPlus className="h-3.5 w-3.5" /> {editingAddress ? "Update Address" : "Save Address"}</>
          )}
        </Button>
      </div>

      {saveSuccess && (
        <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
          <Check className="h-3.5 w-3.5" /> {editingAddress ? "Address updated successfully!" : "Address saved successfully to your account!"}
        </p>
      )}
      {saveError && <p className="text-xs text-rose-500 font-semibold">{saveError}</p>}
    </div>
  );
}

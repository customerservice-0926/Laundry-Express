"use client";

import * as React from "react";
import { MapPin, Phone } from "lucide-react";
import type { User } from "@/types";
import type { UserAddress } from "@/lib/services/address-service";
import { SavedAddressSelector } from "./saved-address-selector";
import { NewAddressForm } from "./new-address-form";
import { PresenceOptions } from "./presence-options";

export interface AddressDetails {
  street: string;
  apt?: string;
  city: string;
  state: string;
  zip: string;
}

interface StepOutOfHomeProps {
  currentUser?: User | null;
  phone: string;
  onPhoneChange: (v: string) => void;
  isOutOfHome: boolean;
  onIsOutOfHomeChange: (v: boolean) => void;
  isAwayForDropoff: boolean;
  onIsAwayForDropoffChange: (v: boolean) => void;
  bagConfirmed: boolean;
  onBagConfirmedChange: (v: boolean) => void;
  address: string;
  onAddressChange: (addr: string) => void;
  addressDetails?: AddressDetails;
  onAddressDetailsChange?: (d: AddressDetails) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  deliveryZones?: { city: string; zip: string }[];
  showValidationErrors?: boolean;
}

export function StepOutOfHome({
  currentUser, phone, onPhoneChange, isOutOfHome, onIsOutOfHomeChange,
  isAwayForDropoff, onIsAwayForDropoffChange, bagConfirmed, onBagConfirmedChange,
  address, onAddressChange, addressDetails, onAddressDetailsChange,
  notes, onNotesChange, deliveryZones = [], showValidationErrors = false,
}: StepOutOfHomeProps) {
  const defaultZone = deliveryZones[0] ?? { city: "", zip: "" };
  const [savedAddresses, setSavedAddresses] = React.useState<UserAddress[]>([]);
  const [selectedSavedId, setSelectedSavedId] = React.useState<string | null>(null);
  const [editingAddress, setEditingAddress] = React.useState<UserAddress | null>(null);
  const [isAddingNew, setIsAddingNew] = React.useState(() => !currentUser?.id);

  const [street, setStreet] = React.useState(addressDetails?.street ?? "");
  const [apt, setApt] = React.useState(addressDetails?.apt ?? "");
  const [city, setCity] = React.useState(addressDetails?.city ?? defaultZone.city);
  const [state, setState] = React.useState(addressDetails?.state || "IL");
  const [zip, setZip] = React.useState(addressDetails?.zip ?? defaultZone.zip);

  const isInitialFetchDone = React.useRef(false);
  const isAddressInvalid = showValidationErrors && (
    address.trim().length < 5 || !city.trim() || !zip.trim() || !/^\d{5}(-\d{4})?$/.test(zip.trim())
  );

  const push = React.useCallback((s: string, a: string, c: string, z: string, stateValue: string) => {
    onAddressChange([s, a ? `Apt ${a}` : "", c, stateValue, z].filter(Boolean).join(", "));
    onAddressDetailsChange?.({ street: s, apt: a, city: c, state: stateValue, zip: z });
  }, [onAddressChange, onAddressDetailsChange]);

  const applyAddress = React.useCallback((s: string, a: string, c: string, st: string, z: string) => {
    setStreet(s); setApt(a); setCity(c); setState(st); setZip(z);
    push(s, a, c, z, st);
  }, [push]);

  React.useEffect(() => {
    const userId = currentUser?.id || currentUser?.email;
    if (!userId || isInitialFetchDone.current) return;

    fetch(`/api/user/addresses?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((data) => {
        isInitialFetchDone.current = true;
        if (Array.isArray(data.addresses) && data.addresses.length > 0) {
          const list: UserAddress[] = data.addresses;
          setSavedAddresses(list);
          if (addressDetails?.street && addressDetails.street.trim().length > 0) {
            const match = list.find((a) => a.street_address.toLowerCase() === addressDetails.street.toLowerCase());
            if (match) { setSelectedSavedId(match.id); setIsAddingNew(false); } else { setIsAddingNew(true); }
            return;
          }
          const defaultAddr = list.find((a) => a.is_default) || list[0];
          setSelectedSavedId(defaultAddr.id);
          setIsAddingNew(false);
          applyAddress(defaultAddr.street_address, defaultAddr.apt_unit || "", defaultAddr.city, defaultAddr.state || "", defaultAddr.zip_code);
        } else {
          setIsAddingNew(true);
        }
      })
      .catch(() => { isInitialFetchDone.current = true; setIsAddingNew(true); });
  }, [currentUser?.id, currentUser?.email, addressDetails?.street, applyAddress]);

  const selectSavedAddress = (addr: UserAddress) => {
    setSelectedSavedId(addr.id); setEditingAddress(null); setIsAddingNew(false);
    applyAddress(addr.street_address, addr.apt_unit || "", addr.city, addr.state || "", addr.zip_code);
  };

  const handleStartAddNew = () => {
    setSelectedSavedId(null); setEditingAddress(null); setIsAddingNew(true);
    applyAddress("", "", defaultZone.city, "", defaultZone.zip);
  };

  const handleEditAddress = (addr: UserAddress) => {
    setSelectedSavedId(addr.id); setEditingAddress(addr); setIsAddingNew(true);
    applyAddress(addr.street_address, addr.apt_unit || "", addr.city, addr.state || "", addr.zip_code);
  };

  const handleAddressSaved = (savedAddr: UserAddress) => {
    setSavedAddresses((prev) => {
      const exists = prev.some((a) => a.id === savedAddr.id);
      return exists ? prev.map((a) => (a.id === savedAddr.id ? savedAddr : a)) : [savedAddr, ...prev];
    });
    setEditingAddress(null); selectSavedAddress(savedAddr);
  };

  const handleCancelForm = () => {
    setEditingAddress(null);
    if (savedAddresses.length > 0) {
      const current = savedAddresses.find((a) => a.id === selectedSavedId) || savedAddresses[0];
      selectSavedAddress(current);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 rounded-2xl bg-white border border-slate-200 w-full max-w-full">
      <div className="space-y-3">
        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
          <MapPin className="h-3.5 w-3.5 text-primary" /> Pickup &amp; Delivery Address *
        </label>
        <SavedAddressSelector savedAddresses={savedAddresses} selectedSavedId={selectedSavedId} onSelectSavedAddress={selectSavedAddress} isAddingNew={isAddingNew} onStartAddNew={handleStartAddNew} onEditAddress={handleEditAddress} />
        {isAddressInvalid && <p role="alert" className="text-xs font-medium text-rose-600">Enter a street address, city, 2-letter state code, and valid 5-digit ZIP code.</p>}
        {(isAddingNew || savedAddresses.length === 0) && (
          <NewAddressForm
            key={editingAddress?.id || "new-address"} currentUser={currentUser}
            street={street} onStreetChange={(v) => { setStreet(v); push(v, apt, city, zip, state); }}
            apt={apt} onAptChange={(v) => { setApt(v); push(street, v, city, zip, state); }}
            city={city} onCityChange={(v) => { setCity(v); push(street, apt, v, zip, state); }}
            state={state} onStateChange={(v) => { setState(v); push(street, apt, city, zip, v); }}
            zip={zip} onZipChange={(v) => { setZip(v); push(street, apt, city, v, state); }}
            deliveryZones={deliveryZones} showValidationErrors={showValidationErrors}
            onAddressSaved={handleAddressSaved} hasSavedAddresses={savedAddresses.length > 0}
            onCancelAddNew={handleCancelForm} editingAddress={editingAddress}
          />
        )}
      </div>

      <div className="space-y-1.5">
        <label className="flex items-center justify-between text-xs font-bold text-slate-800 uppercase tracking-wider">
          <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-primary" /> Contact Phone Number *</span>
          <span className="text-[10px] text-slate-400 font-normal lowercase">saved to profile for driver updates</span>
        </label>
        <input
          type="tel" value={phone} onChange={(e) => onPhoneChange(e.target.value)} placeholder="(815) 555-0199"
          className={`w-full px-3 py-2 rounded-xl border text-xs focus:ring-2 focus:ring-primary focus:outline-none ${
            showValidationErrors && (!phone || phone.trim().length < 7) ? "border-rose-400 bg-rose-50/50" : "border-slate-200"
          }`}
        />
        {showValidationErrors && (!phone || phone.trim().length < 7) && <p className="text-[11px] text-rose-500 font-semibold">Valid phone number required for driver dispatch updates.</p>}
      </div>

      <PresenceOptions
        isOutOfHome={isOutOfHome} onIsOutOfHomeChange={onIsOutOfHomeChange}
        isAwayForDropoff={isAwayForDropoff} onIsAwayForDropoffChange={onIsAwayForDropoffChange}
        bagConfirmed={bagConfirmed} onBagConfirmedChange={onBagConfirmedChange}
        isDoorstepInvalid={showValidationErrors && isOutOfHome && !bagConfirmed}
      />

      <div className="space-y-1">
        <label className="block text-xs font-semibold text-slate-700">Special Instructions (Optional)</label>
        <textarea
          rows={2} placeholder="e.g. Ring bell or gate code #1234." value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-primary focus:outline-none resize-none"
        />
      </div>
    </div>
  );
}

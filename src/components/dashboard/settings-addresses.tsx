"use client";

import * as React from "react";
import type { UserAddress } from "@/lib/services/address-service";
import { Plus, Trash2, Edit2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  SERVICEABLE_CITIES,
  getDefaultZipForCity,
  getCityForZip,
} from "@/lib/services/geo-radius-service";

export interface SavedAddress {
  id: string;
  label: string;
  street: string;
  apt?: string;
  city: string;
  state: string;
  zip: string;
  isDefault: boolean;
}

export function SettingsAddresses() {
  const [addresses, setAddresses] = React.useState<SavedAddress[]>([]);
  const [isAdding, setIsAdding] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [label, setLabel] = React.useState("Home");
  const [street, setStreet] = React.useState("");
  const [apt, setApt] = React.useState("");
  const [city, setCity] = React.useState("");
  const [state, setState] = React.useState("IL");
  const [zip, setZip] = React.useState("");
  const [isDefault, setIsDefault] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/user/addresses").then((r) => r.json()).then((data) => {
      if (Array.isArray(data.addresses)) {
        setAddresses(data.addresses.map((a: UserAddress) => ({
          id: a.id, label: a.label || "Home", street: a.street_address, apt: a.apt_unit,
          city: a.city, state: a.state || "IL", zip: a.zip_code, isDefault: a.is_default || false,
        })));
      }
    }).catch(() => {});
  }, []);

  const handleCitySelect = (selectedCity: string) => {
    setCity(selectedCity);
    const defaultZip = getDefaultZipForCity(selectedCity);
    if (defaultZip) setZip(defaultZip);
  };

  const handleZipChange = (newVal: string) => {
    const cleaned = newVal.replace(/\D/g, "").slice(0, 5);
    setZip(cleaned);
    if (cleaned.length === 5) {
      const matchedCity = getCityForZip(cleaned);
      if (matchedCity) setCity(matchedCity);
    }
  };

  const resetForm = () => {
    setLabel("Home"); setStreet(""); setApt("");
    setCity(""); setState("IL"); setZip("");
    setIsDefault(false); setIsAdding(false); setEditingId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!street.trim() || !city.trim() || !zip.trim()) return;

    const newAddr: SavedAddress = {
      id: editingId || `addr-${Date.now()}`,
      label, street: street.trim(), apt: apt.trim() || undefined,
      city: city.trim(), state: state.trim() || "IL", zip: zip.trim(), isDefault,
    };

    setAddresses((prev) => (editingId ? prev.map((a) => (a.id === editingId ? newAddr : a)) : [newAddr, ...prev]));

    try {
      await fetch("/api/user/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newAddr.id, label: newAddr.label, street_address: newAddr.street,
          apt_unit: newAddr.apt, city: newAddr.city, state: newAddr.state,
          zip_code: newAddr.zip, is_default: newAddr.isDefault,
        }),
      });
    } catch {}
    resetForm();
  };

  const handleStartEdit = (addr: SavedAddress) => {
    setEditingId(addr.id); setLabel(addr.label); setStreet(addr.street);
    setApt(addr.apt || ""); setCity(addr.city); setState(addr.state || "IL");
    setZip(addr.zip); setIsDefault(addr.isDefault); setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (addresses.length <= 1) {
      setDeleteError("You must keep at least one address on file.");
      return;
    }
    setDeleteError(null);
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    try {
      await fetch(`/api/user/addresses?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch {
      setDeleteError("Failed to remove address. Please try again.");
    }
  };

  const isCustomCity = city && !SERVICEABLE_CITIES.some((c) => c.city.toLowerCase() === city.toLowerCase());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Saved Addresses</h3>
          <p className="text-xs text-slate-500">Manage doorstep pickup and delivery locations within our 40-mile radius.</p>
        </div>
        {!isAdding && (
          <Button size="sm" variant="hero" onClick={() => setIsAdding(true)} className="cursor-pointer text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" /><span>Add New Address</span>
          </Button>
        )}
      </div>

      {deleteError && (
        <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{deleteError}</span>
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleSave} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Select Service City (40-Mile Radius) *</label>
            <select
              value={city}
              onChange={(e) => handleCitySelect(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-xs"
              required
            >
              <option value="">-- Choose City --</option>
              {isCustomCity && <option value={city}>{city} (Selected)</option>}
              <optgroup label="Standard Zone — Free Delivery (0–30 Miles)">
                {SERVICEABLE_CITIES.filter((c) => !c.isExtended).map((c) => (
                  <option key={c.city} value={c.city}>{c.city} (Free Delivery)</option>
                ))}
              </optgroup>
              <optgroup label="Extended Service Area — $10 Fee (30–40 Miles)">
                {SERVICEABLE_CITIES.filter((c) => c.isExtended).map((c) => (
                  <option key={c.city} value={c.city}>{c.city} ($10 Fee)</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Address Label</label>
              <input type="text" required placeholder="e.g. Home, Office" value={label} onChange={(e) => setLabel(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white" />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Street Address *</label>
              <input type="text" required placeholder="123 Main St" value={street} onChange={(e) => setStreet(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Apt / Suite (optional)</label>
              <input type="text" placeholder="Apt 4B" value={apt} onChange={(e) => setApt(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white" />
            </div>
            <div className="sm:col-span-2 grid grid-cols-3 gap-2">
              <div>
                <label className="font-bold text-slate-700 block mb-1">City</label>
                <input type="text" readOnly value={city} className="w-full px-2 py-2 rounded-xl border border-slate-200 bg-slate-100 font-medium" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">State</label>
                <input type="text" readOnly value="IL" className="w-full px-2 py-2 rounded-xl border border-slate-200 bg-slate-100 font-medium text-center text-slate-700 cursor-not-allowed" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">ZIP *</label>
                <input type="text" required maxLength={5} value={zip} onChange={(e) => handleZipChange(e.target.value)} placeholder="60156" className="w-full px-2 py-2 rounded-xl border border-slate-200 bg-white font-medium text-center" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="rounded text-primary" />
              <span className="font-semibold text-slate-700">Set as default pickup location</span>
            </label>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={resetForm} className="cursor-pointer">Cancel</Button>
              <Button type="submit" variant="hero" size="sm" className="cursor-pointer">Save Address</Button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {addresses.length === 0 && !isAdding && (
          <div className="p-6 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-slate-400 text-xs">
            No saved addresses yet. Click &quot;Add New Address&quot; above to add your primary pickup doorstep.
          </div>
        )}
        {addresses.map((a) => (
          <div key={a.id} className="p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-xs">{a.label}</span>
                {a.isDefault && <Badge variant="secondary">Default</Badge>}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">{a.street}{a.apt ? `, ${a.apt}` : ""}, {a.city}, {a.state} {a.zip}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={() => handleStartEdit(a)} className="h-7 w-7 p-0 cursor-pointer">
                <Edit2 className="h-3.5 w-3.5 text-slate-500" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(a.id)}
                disabled={addresses.length <= 1}
                title={addresses.length <= 1 ? "At least one saved address must be kept" : "Delete address"}
                className="h-7 w-7 p-0 cursor-pointer text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

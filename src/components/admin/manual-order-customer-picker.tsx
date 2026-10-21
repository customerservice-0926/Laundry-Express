"use client";

import * as React from "react";
import { Search, UserCheck, X, Check, Loader2, Sparkles } from "lucide-react";
import type { CustomerAccount } from "./customer-detail-modal";
import type { ManualOrderFormState } from "./manual-order-types";

interface CustomerPickerProps {
  onSelectCustomer: (fields: Partial<ManualOrderFormState>) => void;
  currentEmail?: string;
}

export function ManualOrderCustomerPicker({ onSelectCustomer, currentEmail }: CustomerPickerProps) {
  const [customers, setCustomers] = React.useState<CustomerAccount[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedCustName, setSelectedCustName] = React.useState<string | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let active = true;
    setIsLoading(true);
    fetch("/api/customers")
      .then((r) => r.json())
      .then((data) => {
        if (active && Array.isArray(data?.customers)) {
          setCustomers(data.customers);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => { active = false; };
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = React.useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return customers.slice(0, 6);
    return customers.filter(
      (c) =>
        c.full_name?.toLowerCase().includes(q) ||
        c.phone?.replace(/\D/g, "").includes(q.replace(/\D/g, "")) ||
        c.email?.toLowerCase().includes(q) ||
        c.address?.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [customers, searchTerm]);

  const handlePick = (c: CustomerAccount) => {
    const latestOrder = c.orders?.[0];
    const isPhoneDummyEmail = c.email.includes("@call.laundryexpress.local");

    const fields: Partial<ManualOrderFormState> = {
      customer_name: c.full_name || "",
      customer_phone: c.phone !== "—" ? c.phone : "",
      customer_email: isPhoneDummyEmail ? "" : c.email,
      street_address: latestOrder?.street_address || (c.address !== "—" ? c.address.split(",")[0]?.trim() : "") || "",
      apt_unit: latestOrder?.apt_unit || "",
      city: latestOrder?.city || "Lake in the Hills",
      state: latestOrder?.state || "IL",
      zip_code: latestOrder?.zip_code || "60156",
    };

    onSelectCustomer(fields);
    setSelectedCustName(c.full_name);
    setSearchTerm("");
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedCustName(null);
    setSearchTerm("");
  };

  return (
    <div className="relative mb-3" ref={dropdownRef}>
      {selectedCustName ? (
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
          <div className="flex items-center gap-2 text-emerald-800 font-semibold truncate">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="truncate">Loaded: <strong>{selectedCustName}</strong></span>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-[11px] font-bold text-slate-500 hover:text-slate-800 ml-2 cursor-pointer flex items-center gap-1"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        </div>
      ) : (
        <div>
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onFocus={() => setIsOpen(true)}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsOpen(true);
              }}
              placeholder="🔍 Search existing customer (Name, Phone, or Email)..."
              className="w-full h-9 pl-9 pr-8 rounded-xl border border-dashed border-slate-300 bg-slate-50/80 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
            {isLoading && (
              <Loader2 className="h-3.5 w-3.5 text-slate-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
            )}
          </div>

          {isOpen && (
            <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-xl divide-y divide-slate-100 text-xs">
              <div className="p-2 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Select Existing Customer</span>
                <span>{filtered.length} matches</span>
              </div>
              {filtered.length === 0 ? (
                <div className="p-4 text-center text-slate-400 italic text-[11px]">
                  No matching customer found. Type info manually below.
                </div>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handlePick(c)}
                    className="w-full p-2.5 text-left hover:bg-pink-50/70 transition flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 group-hover:text-primary transition truncate">
                        {c.full_name}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {c.phone} {c.email && !c.email.includes("@call.laundryexpress.local") ? `• ${c.email}` : ""}
                      </div>
                      {c.address && c.address !== "—" && (
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          📍 {c.address}
                        </div>
                      )}
                    </div>
                    <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 group-hover:bg-primary group-hover:text-white transition">
                      Select
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

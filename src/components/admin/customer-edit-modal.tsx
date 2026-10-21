"use client";

import * as React from "react";
import { User, Mail, Phone, MapPin } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { CustomerAccount } from "./customer-detail-modal";

interface CustomerEditModalProps {
  customer: CustomerAccount | null;
  isOpen: boolean;
  onClose: () => void;
  onCustomerUpdated: (data: { full_name: string; email: string; phone: string; address: string }) => void;
}

export function CustomerEditModal({ customer, isOpen, onClose, onCustomerUpdated }: CustomerEditModalProps) {
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (customer) {
      setFullName(customer.full_name || "");
      setEmail(customer.email || "");
      setPhone(customer.phone || "");
      setAddress(customer.address || "");
      setError("");
    }
  }, [customer]);

  if (!customer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    setIsSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          address: address.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update customer.");
      onCustomerUpdated({ full_name: fullName.trim(), email: email.trim(), phone: phone.trim(), address: address.trim() });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save customer.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose} title={`Edit Customer: ${customer.full_name}`} description="Modify profile details and address on file." className="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs text-slate-700">
        {error && <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">{error}</div>}

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Full Name *</label>
          <div className="relative">
            <User className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900" />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Address</label>
          <div className="relative">
            <Mail className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900" />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Phone Number</label>
          <div className="relative">
            <Phone className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900" />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Street Address</label>
          <div className="relative">
            <MapPin className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button type="submit" variant="hero" size="sm" disabled={isSaving} className="font-bold">
            {isSaving ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

"use client";

import * as React from "react";
import { Phone, Mail, MapPin, CreditCard, Star, CheckCircle2, Edit3, Trash2 } from "lucide-react";
import type { Order, OrderReview } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { toast } from "@/components/ui/toast";
import { CustomerEditModal } from "./customer-edit-modal";

export interface CustomerAccount {
  id: string; full_name: string; email: string; phone: string; address: string; joined_date: string;
  orders: Order[]; reviews: OrderReview[];
  payments: { id: string; amount: number; date: string; method: string; status: string; order_number: string }[];
}

interface CustomerDetailModalProps {
  customer: CustomerAccount | null;
  isOpen: boolean;
  onClose: () => void;
  onCustomerUpdated?: (updated: CustomerAccount) => void;
  onCustomerDeleted?: (customerId: string) => void;
}

type TabKey = "orders" | "payments" | "reviews";

export function CustomerDetailModal({
  customer,
  isOpen,
  onClose,
  onCustomerUpdated,
  onCustomerDeleted,
}: CustomerDetailModalProps) {
  const [activeTab, setActiveTab] = React.useState<TabKey>("orders");
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  if (!customer) return null;

  const totalSpent = customer.orders.reduce((sum, o) => sum + o.total_amount, 0);

  const handleDeleteCustomer = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to delete.");
      toast.success(`Customer ${customer.full_name} was deleted successfully.`);
      setIsDeleteOpen(false);
      if (onCustomerDeleted) onCustomerDeleted(customer.id);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to delete customer.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={onClose}
      title={`Customer Profile: ${customer.full_name}`}
      description={`Customer Account #${customer.id} • Registered ${customer.joined_date}`}
      className="max-w-3xl"
    >
      <div className="space-y-4 text-xs text-slate-700">
        {/* Customer Header Summary Card */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-primary text-white font-black text-base flex items-center justify-center shrink-0 shadow-xs">
              {customer.full_name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-slate-900">{customer.full_name}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-pink-100 text-primary">
                  {customer.orders.length > 1 ? "Repeat Customer" : "New Customer"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-slate-500 text-[11px] mt-0.5">
                <a href={`mailto:${customer.email}`} className="flex items-center gap-1 hover:text-primary"><Mail className="h-3 w-3 shrink-0" /><span>{customer.email}</span></a>
                <a href={`tel:${customer.phone}`} className="flex items-center gap-1 hover:text-primary"><Phone className="h-3 w-3 shrink-0" /><span>{customer.phone}</span></a>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
            <div className="p-2 rounded-xl bg-white border border-slate-200 text-center min-w-[76px]"><span className="text-[10px] text-slate-400 font-bold uppercase block">Orders</span><span className="text-sm font-black text-slate-900 block">{customer.orders.length}</span></div>
            <div className="p-2 rounded-xl bg-white border border-slate-200 text-center min-w-[85px]"><span className="text-[10px] text-slate-400 font-bold uppercase block">Spent</span><span className="text-sm font-black text-emerald-600 block">{formatCurrency(totalSpent)}</span></div>
          </div>
        </div>

        {/* Address Banner */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/60 border border-slate-200 text-slate-600 text-[11px]">
          <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
          <span className="font-medium truncate">{customer.address}</span>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200">
          {(["orders", "payments", "reviews"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer capitalize ${activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
            >
              {tab === "orders" ? `Orders (${customer.orders.length})` : tab === "payments" ? `Payments (${customer.payments.length})` : `Reviews (${customer.reviews.length})`}
            </button>
          ))}
        </div>

        {/* Tab 1: Orders History Table */}
        {activeTab === "orders" && (
          <div className="space-y-2">
            {customer.orders.length === 0 ? (
              <p className="text-slate-400 py-4 text-center italic">No orders logged yet.</p>
            ) : (
              <div className="rounded-xl border border-slate-200 overflow-x-auto w-full">
                  <table className="w-full min-w-[500px] text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5 whitespace-nowrap">Order</th>
                        <th className="p-2.5 whitespace-nowrap">Date</th>
                        <th className="p-2.5 whitespace-nowrap">Mode</th>
                        <th className="p-2.5 whitespace-nowrap">Total</th>
                        <th className="p-2.5 whitespace-nowrap">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customer.orders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-50/70">
                          <td className="p-2.5 font-bold text-slate-900 whitespace-nowrap">{ord.order_number}</td>
                          <td className="p-2.5 text-slate-500 whitespace-nowrap">{formatDate(ord.created_at)}</td>
                          <td className="p-2.5 uppercase text-[10px] font-semibold whitespace-nowrap">{String(ord.pricing_mode || "per_bag").replace(/_/g, " ")}</td>
                          <td className="p-2.5 font-extrabold text-slate-900 whitespace-nowrap">{formatCurrency(ord.total_amount)}</td>
                          <td className="p-2.5 whitespace-nowrap"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{String(ord.order_status || "pending").replace(/_/g, " ")}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            )}
          </div>
        )}

        {/* Tab 2: Stripe Payments History */}
        {activeTab === "payments" && (
          <div className="space-y-1.5">
            {customer.payments.length === 0 ? (
              <p className="text-slate-400 py-4 text-center italic">No Stripe transactions recorded.</p>
            ) : (
              <div className="divide-yrounded-xl border border-slate-200 bg-white">
                {customer.payments.map((pmt) => (
                  <div key={pmt.id} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <CreditCard className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <span className="font-bold text-slate-900 block font-mono text-[11px]">{pmt.id}</span>
                        <span className="text-[10px] text-slate-400">Order {pmt.order_number} • {pmt.date} • {pmt.method}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-slate-900 block">{formatCurrency(pmt.amount)}</span>
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 justify-end"><CheckCircle2 className="h-3 w-3" />{pmt.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Reviews Submitted */}
        {activeTab === "reviews" && (
          <div className="space-y-2">
            {customer.reviews.length === 0 ? (
              <p className="text-slate-400 py-4 text-center italic">Customer has not left any reviews yet.</p>
            ) : (
              customer.reviews.map((rev) => (
                <div key={rev.id} className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < rev.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
                      ))}
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {rev.status}
                    </span>
                  </div>
                  <p className="text-slate-700">&ldquo;{rev.comment}&rdquo;</p>
                  <span className="text-[10px] text-slate-400 block">{formatDate(rev.created_at)}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)} className="text-slate-700">
              <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit Profile
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setIsDeleteOpen(true)}
              className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>Close Profile</Button>
        </div>
      </div>
      <CustomerEditModal
        customer={customer}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onCustomerUpdated={(up) => {
          if (onCustomerUpdated) onCustomerUpdated({ ...customer, ...up });
          setIsEditOpen(false);
        }}
      />
      <ConfirmModal
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={handleDeleteCustomer}
        title={`Delete Customer ${customer.full_name}?`}
        description="This will permanently delete this customer account. Any completed orders will remain in history."
        confirmText="Delete Customer"
        isLoading={isDeleting}
      />
    </Dialog>
  );
}

export default CustomerDetailModal;

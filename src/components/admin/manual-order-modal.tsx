"use client";

import * as React from "react";
import { PhoneCall, Loader2, AlertCircle, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { OrderInvoiceModal } from "@/components/booking/order-invoice-modal";
import { orderToUnifiedInvoice } from "@/lib/invoice/invoice-utils";
import type { DetergentItem } from "@/lib/services/catalog-service";
import type { Order, PricingConfig } from "@/types";
import { ManualOrderStep1 } from "./manual-order-step1";
import { ManualOrderStep2 } from "./manual-order-step2";
import { ManualOrderStep3 } from "./manual-order-step3";
import type { ManualOrderFormState, ManualOrderFieldChange } from "./manual-order-types";

interface ManualOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (order: Order) => void;
}

const getTomorrowDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
};

const INITIAL_FORM: ManualOrderFormState = {
  customer_name: "",
  customer_phone: "",
  customer_email: "",
  street_address: "",
  apt_unit: "",
  city: "Dallas",
  state: "TX",
  zip_code: "75201",
  pricing_mode: "per_bag",
  bag_count: 1,
  estimated_weight_lbs: 15,
  detergent_id: "",
  pickup_date: getTomorrowDate(),
  pickup_slot: "8am-12pm",
  delivery_date: "",
  payment_method: "cash",
  payment_status: "paid",
  order_status: "confirmed",
  is_out_of_home: false,
  special_instructions: "",
  send_email_copy: true,
};

const STEPS = [
  { num: 1, label: "Customer & Address" },
  { num: 2, label: "Laundry & Schedule" },
  { num: 3, label: "Payment & Confirm" },
] as const;

export function ManualOrderModal({ isOpen, onClose, onOrderCreated }: ManualOrderModalProps) {
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [form, setForm] = React.useState<ManualOrderFormState>(INITIAL_FORM);
  const [detergents, setDetergents] = React.useState<DetergentItem[]>([]);
  const [pricing, setPricing] = React.useState<PricingConfig | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [invoiceOrder, setInvoiceOrder] = React.useState<Order | null>(null);

  const resetForm = React.useCallback(() => {
    setForm({
      ...INITIAL_FORM,
      detergent_id: detergents[0]?.id || "",
      pickup_date: getTomorrowDate(),
    });
    setStep(1);
    setErrorMessage("");
  }, [detergents]);

  const handleModalClose = () => {
    resetForm();
    onClose();
  };

  React.useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setErrorMessage("");
    setForm({
      ...INITIAL_FORM,
      detergent_id: detergents[0]?.id || "",
      pickup_date: getTomorrowDate(),
    });
    void Promise.all([
      fetch("/api/catalog").then((r) => r.json()).catch(() => null),
      fetch("/api/pricing").then((r) => r.json()).catch(() => null),
    ]).then(([catData, priceData]) => {
      if (catData?.success && Array.isArray(catData.detergents)) {
        setDetergents(catData.detergents);
        if (catData.detergents.length > 0) {
          setForm((f) => ({ ...f, detergent_id: catData.detergents[0].id }));
        }
      }
      if (priceData?.pricing) setPricing(priceData.pricing);
    });
  }, [isOpen]);

  const selectedDetergent = detergents.find((d) => d.id === form.detergent_id);
  const detergentFee = Number(selectedDetergent?.price || 0);

  const { subtotal, deliveryFee, totalAmount } = React.useMemo(() => {
    let sub = 0, del = 0;
    if (pricing) {
      if (form.pricing_mode === "per_bag") {
        sub = form.bag_count * pricing.bag_price;
        del = form.bag_count >= pricing.free_delivery_threshold ? 0 : pricing.standard_delivery_fee;
      } else {
        sub = Math.round(form.estimated_weight_lbs * pricing.pound_price * 100) / 100;
        del = form.estimated_weight_lbs >= pricing.free_delivery_lbs ? 0 : pricing.standard_delivery_fee;
      }
    } else {
      sub = form.pricing_mode === "per_bag" ? form.bag_count * 25 : form.estimated_weight_lbs * 1.75;
      del = 4.99;
    }
    return { subtotal: sub, deliveryFee: del, totalAmount: Math.max(0, Math.round((sub + detergentFee + del) * 100) / 100) };
  }, [pricing, form.pricing_mode, form.bag_count, form.estimated_weight_lbs, detergentFee]);

  const handleFieldChange: ManualOrderFieldChange = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const handleNext = () => {
    setErrorMessage("");
    if (step === 1) {
      if (!form.customer_name.trim() || !form.customer_phone.trim()) {
        setErrorMessage("Customer name and phone number are required."); return;
      }
      if (!form.street_address.trim() || !form.city.trim() || !form.zip_code.trim()) {
        setErrorMessage("Street address, city, and zip are required."); return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!form.pickup_date.trim()) { setErrorMessage("Pickup date is required."); return; }
      setStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/orders/manual", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.order) throw new Error(data.error || "Failed to create order.");
      onOrderCreated(data.order);
      setInvoiceOrder(data.order);
      resetForm();
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error creating order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const invoiceData = React.useMemo(() => invoiceOrder ? orderToUnifiedInvoice(invoiceOrder) : null, [invoiceOrder]);

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={handleModalClose}
        size="lg"
        title="Create Phone / Manual Order"
        description="Step-by-step entry for phone-in orders. Logs data for admin analytics and provides official invoices."
      >
        <div className="space-y-4">
          {/* Stepper Indicator */}
          <div className="grid grid-cols-3 gap-2 pb-2 border-b border-slate-100 text-xs font-bold">
            {STEPS.map((s) => (
              <div key={s.num} className={`flex items-center gap-2 pb-1 border-b-2 transition ${step === s.num ? "border-primary text-primary" : step > s.num ? "border-emerald-500 text-emerald-600" : "border-slate-200 text-slate-400"}`}>
                <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] text-white shrink-0 ${step === s.num ? "bg-primary" : step > s.num ? "bg-emerald-500" : "bg-slate-300"}`}>
                  {step > s.num ? <Check className="h-3 w-3" /> : s.num}
                </span>
                <span className="truncate">{s.label}</span>
              </div>
            ))}
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-4">
            {step === 1 && <ManualOrderStep1 form={form} onChange={handleFieldChange} />}
            {step === 2 && <ManualOrderStep2 form={form} onChange={handleFieldChange} detergents={detergents} />}
            {step === 3 && (
              <ManualOrderStep3
                form={form} onChange={handleFieldChange} subtotal={subtotal}
                deliveryFee={deliveryFee} detergentFee={detergentFee} totalAmount={totalAmount}
              />
            )}

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-200">
              {step > 1 ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setStep((s) => (s - 1) as 1 | 2)} className="text-xs">
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
                </Button>
              ) : (
                <Button type="button" variant="ghost" size="sm" onClick={handleModalClose} className="text-xs text-slate-500">Cancel</Button>
              )}

              {step < 3 ? (
                <Button type="button" size="sm" onClick={handleNext} className="bg-primary hover:bg-primary-dark text-white text-xs font-bold shadow-xs">
                  <span>Next Step</span> <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              ) : (
                <Button type="button" size="sm" onClick={handleSubmit} disabled={isSubmitting} className="bg-primary hover:bg-primary-dark text-white text-xs font-bold shadow-xs cursor-pointer">
                  {isSubmitting ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Creating Order...</> : <><PhoneCall className="h-3.5 w-3.5 mr-1.5" /> Create Order &amp; Invoice</>}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Dialog>

      {invoiceData && <OrderInvoiceModal invoice={invoiceData} onClose={() => setInvoiceOrder(null)} />}
    </>
  );
}

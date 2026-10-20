"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ArrowRight, Loader2, FileText, Link as LinkIcon } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { downloadInvoiceAsPdf } from "@/lib/invoice/pdf-invoice-generator";
import type { UnifiedInvoiceInput } from "@/lib/invoice/invoice-html-template";
import { formatCurrency } from "@/lib/utils";

export type InvoiceData = UnifiedInvoiceInput;

interface OrderInvoiceModalProps {
  invoice: InvoiceData | null;
  onClose: () => void;
}

export function OrderInvoiceModal({ invoice, onClose }: OrderInvoiceModalProps) {
  const router = useRouter();
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false);

  if (!invoice) return null;

  const orderNum = invoice.orderNumber || invoice.orderId || "LX-ORDER";
  const planLabel = invoice.orderDetails?.planName || invoice.planName || "Wash & Fold";
  const qtyLabel = invoice.orderDetails?.quantity || invoice.quantity || "1 Order";
  const detergentLabel = invoice.orderDetails?.detergent || invoice.detergent || "Detergent";
  const addlFee = Number(invoice.additionalItemsFee || (invoice as unknown as { additional_items_fee?: number }).additional_items_fee || 0);
  const tipAmount = Number(invoice.tipAmount || (invoice as unknown as { tip_amount?: number }).tip_amount || 0);
  const rawAddl = invoice.additionalItems || (invoice as unknown as { additional_items?: { name: string; price: number; quantity: number }[] }).additional_items;
  const additionalItems = Array.isArray(rawAddl) ? rawAddl : [];

  const handleTrackOrder = () => {
    onClose();
    if (typeof window !== "undefined" && window.location.pathname !== "/dashboard/orders") {
      router.push("/dashboard/orders");
    }
  };

  const handlePdfDownload = async () => {
    try {
      setIsGeneratingPdf(true);
      await downloadInvoiceAsPdf(invoice, `LaundryExpress-Invoice-${orderNum}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <Dialog
      open={!!invoice}
      onOpenChange={onClose}
      size="md"
      title="Order Confirmed & Scheduled"
      description={`Official invoice generated for Order #${orderNum}.`}
    >
      <div className="space-y-4 py-1 text-xs">
        {/* Compact Invoice Summary Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3.5 shadow-xs">
          {/* Card Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <div className="font-black text-slate-900 text-sm tracking-tight">
                LAUNDRY <span className="text-primary">EXPRESS</span>
              </div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                Official Tax Invoice • #{orderNum}
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>CONFIRMED</span>
            </span>
          </div>

          {/* Compact 2-Column Info Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer</span>
              <p className="font-bold text-slate-900 truncate">{invoice.customerName}</p>
              {invoice.customerPhone && <p className="text-slate-500 text-[11px]">{invoice.customerPhone}</p>}
              <p className="text-slate-500 text-[11px] line-clamp-1">{invoice.address}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Pickup &amp; Service</span>
              <p className="font-bold text-slate-900">{invoice.pickupDate} ({invoice.pickupSlot})</p>
              <p className="text-slate-600 text-[11px] truncate">{qtyLabel} • {planLabel}</p>
              <p className="text-slate-500 text-[11px] truncate">{detergentLabel}</p>
              {additionalItems.length > 0 && (
                <p className="text-slate-700 text-[11px] font-semibold truncate">
                  Specialty: {additionalItems.map((i) => `${i.name} (${i.quantity}x)`).join(", ")}
                </p>
              )}
            </div>
          </div>

          {/* Compact Settlement Breakdown Bar */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
              <span>Method: <strong className="text-slate-800 uppercase">{invoice.paymentMethod || "Card"}</strong></span>
              <span>•</span>
              <span>Delivery: <strong className={invoice.deliveryFee === 0 ? "text-emerald-700" : "text-slate-800"}>{invoice.deliveryFee === 0 ? "FREE" : formatCurrency(invoice.deliveryFee || 0)}</strong></span>
              {addlFee > 0 && (
                <>
                  <span>•</span>
                  <span>Items: <strong className="text-slate-800">+{formatCurrency(addlFee)}</strong></span>
                </>
              )}
              {tipAmount > 0 && (
                <>
                  <span>•</span>
                  <span>Tip: <strong className="text-emerald-600">+{formatCurrency(tipAmount)}</strong></span>
                </>
              )}
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">Total</span>
              <span className="text-base font-black text-primary leading-tight">
                {formatCurrency(invoice.totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons: ONLY Download and Track Order */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
          {invoice.paymentMethod === "card" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                if (typeof window !== "undefined") {
                  await navigator.clipboard.writeText(`${window.location.origin}/order/pay/${orderNum}`);
                  toast.success("Customer payment link copied to clipboard!");
                }
              }}
              className="cursor-pointer gap-1.5 border-sky-300 text-sky-700 hover:bg-sky-50 font-bold text-xs"
            >
              <LinkIcon className="h-3.5 w-3.5" />
              <span>Copy Payment Link</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePdfDownload}
            disabled={isGeneratingPdf}
            className="cursor-pointer gap-1.5 border-primary/30 text-primary hover:bg-pink-50 font-bold text-xs"
          >
            {isGeneratingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            <span>Download Invoice (PDF)</span>
          </Button>

          <Button
            type="button"
            variant="hero"
            size="sm"
            onClick={handleTrackOrder}
            className="cursor-pointer gap-1.5 font-bold text-xs"
          >
            <span>Track Order</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

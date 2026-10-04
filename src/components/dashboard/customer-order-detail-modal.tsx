"use client";

import * as React from "react";
import { X, MapPin, Phone, Sparkles, Camera, Download, AlertTriangle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatSlotLabel, resolveDetergentName } from "@/lib/utils";
import { downloadInvoiceAsPdf } from "@/lib/invoice/pdf-invoice-generator";
import { orderToUnifiedInvoice } from "@/lib/invoice/invoice-utils";
import { OrderInvoiceCard } from "@/components/booking/order-invoice-card";
import type { Order } from "@/types";

interface CustomerOrderDetailModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CustomerOrderDetailModal({ order, isOpen, onClose }: CustomerOrderDetailModalProps) {
  const [activeTab, setActiveTab] = React.useState<"overview" | "invoice">("overview");
  const [isPdfGenerating, setIsPdfGenerating] = React.useState(false);
  const [pdfError, setPdfError] = React.useState("");
  const [activePhoto, setActivePhoto] = React.useState<string | null>(null);
  const [slotTimes, setSlotTimes] = React.useState({ s1: "", e1: "", s2: "", e2: "" });

  React.useEffect(() => {
    fetch("/api/content?type=settings").then((r) => r.json()).then((d) => {
      if (d?.settings) setSlotTimes({ s1: d.settings.slot1_start || "", e1: d.settings.slot1_end || "", s2: d.settings.slot2_start || "", e2: d.settings.slot2_end || "" });
    }).catch(() => {});
  }, []);

  if (!isOpen || !order) return null;

  const fullAddress = [order.street_address, order.apt_unit ? `Apt ${order.apt_unit}` : "", order.city, order.state, order.zip_code].filter(Boolean).join(", ") || order.pickup_address || "Doorstep Address";
  const slotLabel = slotTimes.s1 && slotTimes.e1 && slotTimes.s2 && slotTimes.e2 && (order.pickup_slot === "8am-12pm" || order.pickup_slot === "1pm-6pm")
    ? formatSlotLabel(order.pickup_slot as "8am-12pm" | "1pm-6pm", slotTimes.s1, slotTimes.e1, slotTimes.s2, slotTimes.e2) : order.pickup_slot;
  const planLabel = order.pricing_mode === "per_bag" ? "By The Bag Wash & Fold (13 Gal)" : order.pricing_mode === "package" ? "Saver Package Credit" : "By The Pound (lb) Wash & Fold";
  const quantityLabel = order.pricing_mode === "per_bag" ? `${order.bag_count || 1} Bag(s)` : `${order.final_weight_lbs || order.estimated_weight_lbs || 15} lbs`;

  const inv = orderToUnifiedInvoice(order, { slotTimes });

  const handleDownloadPdf = async () => {
    try {
      setPdfError("");
      setIsPdfGenerating(true);
      await downloadInvoiceAsPdf(inv, `LaundryExpress-Invoice-${order.order_number}.pdf`);
    } catch {
      setPdfError("Unable to generate the invoice PDF. Please try again.");
    } finally { setIsPdfGenerating(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl p-6 space-y-4 shadow-2xl relative border border-slate-200 max-h-[92vh] overflow-y-auto text-xs">
        <button type="button" onClick={onClose} className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors" title="Close details">
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-8 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-slate-900">Order #{order.order_number}</h3>
              <Badge variant={order.order_status === "completed" ? "success" : "warning"} className="text-[10px] uppercase font-bold">{order.order_status.replace(/_/g, " ")}</Badge>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Placed on {formatDate(order.created_at)} • 24-Hour Express Turnaround</p>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button type="button" onClick={() => setActiveTab("overview")} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${activeTab === "overview" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"}`}>Details &amp; Proofs</button>
            <button type="button" onClick={() => setActiveTab("invoice")} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === "invoice" ? "bg-primary text-white shadow-xs" : "text-slate-500 hover:text-slate-900"}`}><FileText className="h-3.5 w-3.5" /> Official Invoice</button>
          </div>
        </div>

        {activeTab === "invoice" ? (
          <div className="pt-1"><OrderInvoiceCard invoice={inv} /></div>
        ) : (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="font-bold text-slate-700 block">Pickup &amp; Delivery Address:</span>
                  <span className="text-slate-900 font-semibold">{fullAddress}</span>
                  {order.customer_phone && <p className="text-[11px] text-slate-600 mt-0.5">Tel: <strong>{order.customer_phone}</strong></p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                <div><span className="text-[10px] text-slate-400 font-bold uppercase block">Pickup Window</span><span className="font-bold text-slate-800">{order.pickup_date}</span><span className="text-slate-500 block text-[11px]">{slotLabel}</span></div>
                <div><span className="text-[10px] text-slate-400 font-bold uppercase block">Estimated Return</span><span className="font-bold text-slate-800">{order.delivery_date || "Within 24 Hours"}</span><span className="text-emerald-600 block text-[11px] font-semibold">Clean &amp; Folded</span></div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-slate-900 border-b border-slate-100 pb-1.5"><Sparkles className="h-4 w-4 text-amber-500 shrink-0" /><span>Wash &amp; Presence Specifications</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Service Plan:</span><span className="font-bold text-slate-900">{planLabel}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Intake Volume:</span><span className="font-bold text-slate-900">{quantityLabel}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Detergent Formula:</span><span className="font-bold text-slate-900">{order.detergent_name || resolveDetergentName(order.detergent_id)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Doorstep Protocol:</span><span className="font-bold text-slate-900">{order.is_out_of_home ? "Away (Contactless Doorstep)" : "Home (Driver Rings Bell)"}</span></div>
              {order.customer_notes && <p className="p-2 rounded-xl bg-slate-50 text-[11px] text-slate-600 italic border border-slate-100">&ldquo;{order.customer_notes}&rdquo;</p>}
            </div>

            {order.has_preexisting_damage && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
                <div className="flex items-center gap-1.5 font-bold"><AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" /><span>Garment Flaw Notice</span></div>
                <p className="text-[11px] text-rose-800">{order.damage_notes || "Inspector flagged pre-existing garment wear before washing."}</p>
                {order.damage_photo_url && (
                  <div onClick={() => setActivePhoto(order.damage_photo_url || null)} className="relative h-28 w-44 rounded-xl overflow-hidden border border-rose-300 bg-rose-100 cursor-pointer hover:opacity-90">
                    <img src={order.damage_photo_url} alt="Garment flaw" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            )}

            {order.proofs && order.proofs.length > 0 && (
              <div className="space-y-2">
                <span className="font-bold text-slate-900 flex items-center justify-between"><span className="flex items-center gap-1.5"><Camera className="h-4 w-4 text-sky-600" /> Verified Photos ({order.proofs.length})</span><span className="text-[10px] text-slate-400">Tap photo to enlarge</span></span>
                <div className="grid grid-cols-2 gap-2">
                  {order.proofs.map((prf) => (
                    <div key={prf.id} onClick={() => setActivePhoto(prf.image_url)} className="relative h-28 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer hover:border-primary/50 transition-all">
                      <img src={prf.image_url} alt="Proof" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatCurrency(order.subtotal || order.total_amount)}</span></div>
              <div className="flex justify-between text-slate-500"><span>Detergent Formulation</span><span className={Number(order.detergent_fee || 0) === 0 ? "text-emerald-600 font-bold" : "text-slate-900 font-semibold"}>{Number(order.detergent_fee || 0) === 0 ? "FREE (Included)" : `+${formatCurrency(Number(order.detergent_fee))}`}</span></div>
              <div className="flex justify-between text-slate-500"><span>Doorstep Delivery</span><span className={order.delivery_fee === 0 ? "text-emerald-600 font-bold" : ""}>{order.delivery_fee === 0 ? "FREE ($0.00)" : formatCurrency(order.delivery_fee)}</span></div>
              {order.discount_amount > 0 && <div className="flex justify-between text-emerald-600 font-bold"><span>Discount</span><span>-{formatCurrency(order.discount_amount)}</span></div>}
              {order.stripe_payment_intent && <div className="flex justify-between text-[11px] text-slate-400 pt-0.5 border-t border-slate-100"><span>Stripe Tx ID:</span><span className="font-mono text-slate-700 select-all font-semibold">{order.stripe_payment_intent}</span></div>}
              <div className="flex justify-between font-black text-sm text-slate-900 pt-1 border-t border-slate-200"><span>{order.payment_status === "paid" ? "Total Paid" : "Order Total"}</span><span className="text-primary">{formatCurrency(order.total_amount)}</span></div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          {order.payment_status === "paid" ? (
            <Button type="button" variant="outline" onClick={handleDownloadPdf} disabled={isPdfGenerating} className="border-primary/30 text-primary hover:bg-pink-50 font-bold text-xs gap-1.5 cursor-pointer">
              <Download className="h-3.5 w-3.5" />{isPdfGenerating ? "Generating PDF..." : "Download Invoice (PDF)"}
            </Button>
          ) : <span className="text-[11px] text-slate-500">Invoice available after payment confirmation.</span>}
          <Button onClick={onClose} className="bg-slate-900 text-white text-xs px-5 cursor-pointer">Close</Button>
        </div>
        {pdfError && <p role="alert" className="text-xs text-rose-700">{pdfError}</p>}

        {activePhoto && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer" onClick={() => setActivePhoto(null)}>
            <div className="relative max-w-2xl max-h-[85vh] w-full rounded-2xl overflow-hidden shadow-2xl bg-black" onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={() => setActivePhoto(null)} className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/90"><X className="h-5 w-5" /></button>
              <img src={activePhoto} alt="Proof Enlarged" className="w-full h-auto max-h-[80vh] object-contain mx-auto" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

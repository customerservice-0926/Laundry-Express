"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ArrowRight, Loader2, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { orderToUnifiedInvoice } from "@/lib/invoice/invoice-utils";
import { OrderInvoiceCard } from "@/components/booking/order-invoice-card";
import { formatCurrency } from "@/lib/utils";
import { useOrdersRealtime } from "@/hooks/use-orders-realtime";
import type { Order } from "@/types";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const orderId = searchParams.get("order_id") || "LX-CONFIRMED";
  const [order, setOrder] = React.useState<Order | null>(null);
  const [paid, setPaid] = React.useState(false);
  const [isStatusChecked, setIsStatusChecked] = React.useState(false);
  const [statusError, setStatusError] = React.useState("");
  const [slotTimes, setSlotTimes] = React.useState({ s1: "", e1: "", s2: "", e2: "" });

  React.useEffect(() => {
    fetch("/api/content?type=settings")
      .then((r) => r.json())
      .then((d) => {
        if (d?.settings) {
          setSlotTimes({
            s1: d.settings.slot1_start || "",
            e1: d.settings.slot1_end || "",
            s2: d.settings.slot2_start || "",
            e2: d.settings.slot2_end || "",
          });
        }
      })
      .catch(() => {});
  }, []);

  const checkStatus = React.useCallback(async () => {
    try {
      const url = `/api/checkout?order_id=${encodeURIComponent(orderId)}${sessionId ? `&session_id=${encodeURIComponent(sessionId)}` : ""}`;
      const response = await fetch(url, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data?.success || !data.order) throw new Error(data?.error || "Unable to retrieve order.");
      setOrder(data.order);
      const isOrderPaid = data.order.payment_status === "paid";
      const isOrderAuthorized = data.order.payment_status === "authorized" || Boolean(data.order.stripe_payment_method_id || data.order.card_last4);
      const isSettled = isOrderPaid || isOrderAuthorized || data.order.payment_status === "failed" || data.order.order_status === "confirmed";
      setPaid(isOrderPaid || isOrderAuthorized);
      setStatusError("");
      if (isSettled) {
        setIsStatusChecked(true);
        return true;
      }
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Unable to verify payment.");
    }
    return false;
  }, [orderId, sessionId]);

  useOrdersRealtime({
    enabled: !isStatusChecked && !paid,
    onEvent: (event) => {
      if (isStatusChecked || paid) return;
      if (event.orderId === orderId || event.orderNumber === orderId || (order && order.id === event.orderId)) {
        void checkStatus();
      }
    },
  });

  React.useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    const runCheck = async () => {
      const done = await checkStatus();
      if (!active || done) return;
      attempts += 1;
      if (attempts < 30) timer = setTimeout(runCheck, 2000);
      else if (active) {
        setIsStatusChecked(true);
        setStatusError("Payment is still pending. You can check the latest status in your dashboard.");
      }
    };
    void runCheck();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [checkStatus]);

  const invoiceData = React.useMemo(() => {
    if (!order) return null;
    return orderToUnifiedInvoice(order, { slotTimes });
  }, [order, slotTimes]);

  if (!order && !isStatusChecked) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
        <h2 className="text-base font-black text-slate-900">Checking your order status...</h2>
        <p className="text-xs text-slate-500">Your order will appear in the dashboard as soon as it is available.</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-base font-black text-slate-900">Order status unavailable</h2>
        <p role="alert" className="text-xs text-rose-700">{statusError || "The order could not be retrieved."}</p>
        <Link href="/dashboard/orders"><Button variant="hero">Open your dashboard</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-6 text-center">
      <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
        <CheckCircle2 className="h-8 w-8" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Order #{order.order_number || orderId} Placed!</h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          {Boolean(order.stripe_payment_method_id || order.card_last4)
            ? "Card verified & saved on file! Your pickup is scheduled. We will inspect your laundry upon arrival and charge the service to your card on file."
            : paid
            ? "Payment confirmed. Your pickup is scheduled and our courier will arrive on time."
            : "Order recorded. Awaiting confirmation."}
        </p>
      </div>

      {(() => {
        const paidToday = Number(order.delivery_fee || 0) + Number(order.tip_amount || 0);
        const nextCharge = Math.max(0, Number(order.total_amount || 0) - paidToday);
        return (
          <div className="max-w-xl mx-auto p-4 rounded-2xl bg-white border border-slate-200 shadow-xs text-left space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Payment Breakdown</span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                {paid ? "Stripe Verified & Saved" : "Confirmed"}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">1. Paid Today via Stripe</span>
                <span className="text-xl font-black text-slate-900 block">{paidToday > 0 ? formatCurrency(paidToday) : "$0.00"}</span>
                <p className="text-[11px] text-slate-500 leading-snug">
                  {paidToday > 0 ? "Doorstep delivery fee & driver tip" : "Free delivery · Card verified on file ($0.00)"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-pink-50/60 border border-pink-200/80 space-y-1">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wide block">2. Next Charge (After Pickup)</span>
                <span className="text-xl font-black text-primary block">{formatCurrency(nextCharge)}</span>
                <p className="text-[11px] text-slate-600 leading-snug">
                  {order.pricing_mode === "per_lb"
                    ? "Laundry wash based on scale weight upon pickup"
                    : "Laundry wash & fold charged to card on file once in custody"}
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {invoiceData && (
        <div className="w-full text-left">
          <OrderInvoiceCard invoice={invoiceData} />
        </div>
      )}

      {paid ? (
        <div className="flex justify-center pt-2">
          <Link href="/dashboard/orders">
            <Button variant="hero" className="cursor-pointer gap-2"><span>Track in Dashboard</span><ArrowRight className="h-4 w-4" /></Button>
          </Link>
        </div>
      ) : (
        <Link href="/dashboard/orders" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
          View pending order in dashboard <ArrowRight className="h-4 w-4" />
        </Link>
      )}

      <div className="pt-2">
        <Link href="/" className="text-xs font-semibold text-slate-500 hover:text-slate-900 inline-flex items-center gap-1">
          <Home className="h-3.5 w-3.5" /> Back to Home
        </Link>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 flex items-center justify-center">
        <React.Suspense fallback={<div className="p-12 text-center text-sm text-slate-400">Loading order status...</div>}>
          <SuccessContent />
        </React.Suspense>
      </main>
      <Footer />
    </div>
  );
}

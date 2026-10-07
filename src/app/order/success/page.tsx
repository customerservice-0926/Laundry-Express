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
      const isOrderAuthorized = data.order.payment_status === "authorized";
      setPaid(isOrderPaid || isOrderAuthorized);
      setStatusError("");
      if (isOrderPaid || isOrderAuthorized || data.order.payment_status === "failed") {
        setIsStatusChecked(true);
        return true;
      }
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Unable to verify payment.");
    }
    return false;
  }, [orderId, sessionId]);

  useOrdersRealtime({
    onEvent: (event) => {
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
          {order.pricing_mode === "per_lb" && order.payment_status === "authorized"
            ? "Card verified & saved! Your pickup is scheduled. We will measure your laundry on our scale upon arrival and charge the exact weight."
            : paid
            ? "Payment confirmed. Your pickup is scheduled and our courier will arrive on time."
            : "Order recorded. Awaiting payment confirmation."}
        </p>
      </div>

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

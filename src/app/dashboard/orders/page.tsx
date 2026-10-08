"use client";

import * as React from "react";
import Link from "next/link";
import { Camera, RotateCcw, Filter, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { DashboardPageLayout } from "@/components/dashboard/dashboard-page-layout";
import { OrderPipeline } from "@/components/admin/order-pipeline";
import { CustomerOrderDetailModal } from "@/components/dashboard/customer-order-detail-modal";
import { ManualOrderModal } from "@/components/admin/manual-order-modal";
import { useOrdersRealtime } from "@/hooks/use-orders-realtime";
import type { Order, OrderStatus } from "@/types";

export default function OrdersUnifiedPage() {
  const { user, isAdmin } = useAuth();
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [isLoading, setIsLoading] = React.useState(true);
  const [ordersError, setOrdersError] = React.useState("");
  const [liveAlert, setLiveAlert] = React.useState<string | null>(null);
  const [checkoutStatus, setCheckoutStatus] = React.useState<"pending" | "confirmed" | "failed" | "cancelled" | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = React.useState(false);

  const refreshSilently = React.useCallback(async () => {
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data?.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
        setSelectedOrder((curr) => curr ? (data.orders.find((o: Order) => o.id === curr.id) || curr) : null);
      }
    } catch {}
  }, []);

  const { isLive } = useOrdersRealtime({
    onEvent: (event) => {
      const isRelevant = isAdmin || (user && (event.userId === user.id || event.customerEmail === user.email))
        || orders.some((o) => o.id === event.orderId || o.order_number === event.orderNumber);
      if (!isRelevant) return;

      const action = event.eventType === "order_created" ? "New order received"
        : event.eventType === "order_paid" ? "Payment confirmed"
        : event.eventType === "order_proof_uploaded" ? `Photo proof uploaded (${event.proofType || "doorstep"})`
        : `Status changed to ${event.orderStatus.replace(/_/g, " ")}`;

      setLiveAlert(`Order #${event.orderNumber} — ${action}`);
      setTimeout(() => setLiveAlert(null), 5000);
      void refreshSilently();
    },
  });

  React.useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const params = new URLSearchParams(window.location.search);
    const isCheckoutReturn = params.get("checkout") === "complete";
    const orderNumber = params.get("order_id");
    let attempts = 0;

    const loadOrders = async () => {
      try {
        const response = await fetch("/api/orders", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok || !data?.success || !Array.isArray(data.orders)) throw new Error(data?.error || "Unable to load orders.");
        if (!active) return;
        setOrders(data.orders);
        setOrdersError("");
        setIsLoading(false);

        if (isCheckoutReturn) {
          const order = data.orders.find((item: Order) => item.order_number === orderNumber);
          if (order?.order_status === "cancelled") setCheckoutStatus("cancelled");
          else if (order?.payment_status === "paid") setCheckoutStatus("confirmed");
          else if (order?.payment_status === "failed") setCheckoutStatus("failed");
          else if (attempts < 30) {
            setCheckoutStatus("pending");
            attempts += 1;
            timer = setTimeout(loadOrders, 2000);
          }
        }
      } catch (error) {
        if (!active) return;
        setOrdersError(error instanceof Error ? error.message : "Unable to load orders.");
        setIsLoading(false);
      }
    };

    if (isCheckoutReturn) setCheckoutStatus("pending");
    void loadOrders();
    return () => { active = false; clearTimeout(timer); };
  }, []);

  const updateOrder = async (payload: Record<string, unknown>) => {
    try {
      const response = await fetch("/api/orders", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) throw new Error(data?.error || "Unable to update order.");
      setOrdersError("");
      return { success: true, paymentStatus: typeof data.order?.payment_status === "string" ? data.order.payment_status : undefined };
    } catch (error) {
      setOrdersError(error instanceof Error ? error.message : "Unable to update order.");
      return { success: false };
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus, reason?: string, notes?: string) => {
    const result = await updateOrder({ orderId, status: newStatus, cancelReason: reason, cancelNotes: notes });
    if (!result.success) return false;
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, order_status: newStatus, ...(result.paymentStatus ? { payment_status: result.paymentStatus } : {}) } : o)));
    return true;
  };

  const handleUploadProof = async (orderId: string, proofType: "pickup" | "dropoff" | "damage", imageUrl: string, notes?: string) => {
    if (!(await updateOrder({ orderId, proofType, imageUrl, notes })).success) return false;
    setOrders((prev) => prev.map((o) => o.id !== orderId ? o : {
      ...o, proofs: [...(o.proofs || []), { id: `prf-${Date.now()}`, order_id: orderId, proof_type: proofType, image_url: imageUrl, notes, uploaded_by: "operations-admin", created_at: new Date().toISOString() }],
    }));
    return true;
  };

  const filteredOrders = React.useMemo(() => {
    if (statusFilter === "all") return orders;
    return orders.filter((o) => o.order_status === statusFilter);
  }, [orders, statusFilter]);

  return (
    <DashboardPageLayout
      activeSection="orders"
      title={isAdmin ? "Orders & Fulfillment Pipeline" : "My Orders & Journey Tracking"}
      subtitle={isAdmin ? "Track laundry dispatches, photo proofs, and live machine wash progress" : "Inspect your real-time 4-stage order journey and verified photo proofs"}
      actions={
        isAdmin ? (
          <Button
            size="sm"
            onClick={() => setIsManualModalOpen(true)}
            className="bg-primary hover:bg-primary-dark text-white text-xs h-8 shadow-xs font-bold"
          >
            <PhoneCall className="h-3.5 w-3.5 mr-1" />
            <span>New Phone Order</span>
          </Button>
        ) : undefined
      }
    >
      {liveAlert && (
        <div role="status" className="mb-4 rounded-xl border border-pink-300 bg-pink-50 p-3 text-xs font-bold text-primary flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
            <span>{liveAlert}</span>
          </div>
          <button type="button" onClick={() => setLiveAlert(null)} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}
      {ordersError && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{ordersError}</p>}
      {checkoutStatus && (
        <div role="status" className={`mb-4 rounded-xl border p-3 text-sm ${checkoutStatus === "confirmed" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : checkoutStatus === "failed" || checkoutStatus === "cancelled" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
          {checkoutStatus === "confirmed" ? "Payment confirmed. Your order is live and verified." : checkoutStatus === "cancelled" ? "Your order was cancelled." : "Payment status updated."}
        </div>
      )}
      {isAdmin ? (
        <OrderPipeline
          orders={orders}
          onUpdateStatus={handleUpdateStatus}
          onUploadProof={handleUploadProof}
          onOpenManualOrder={() => setIsManualModalOpen(true)}
        />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-pink-100">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <select id="customer-status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-300 bg-white cursor-pointer">
                  <option value="all">All Orders ({orders.length})</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="driver_assigned">Driver Assigned</option>
                  <option value="picked_up">Picked Up</option>
                  <option value="in_wash">In Wash</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              {isLive && (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              )}
            </div>
            <Link href="/order">
              <Button className="bg-primary hover:bg-primary-dark text-white text-xs shadow-xs"><RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Book Next Pickup</Button>
            </Link>
          </div>
          <div className="space-y-3">
            {filteredOrders.length === 0 && !isLoading && (
              <div className="p-8 text-center rounded-3xl bg-white border border-slate-200 text-slate-400 text-xs">No orders matching the selected status.</div>
            )}
            {filteredOrders.map((order) => (
              <div key={order.id} onClick={() => setSelectedOrder(order)} className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-pink-300 hover:shadow-xs transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-black text-slate-900">Order #{order.order_number}</span>
                    <Badge variant={order.order_status === "completed" ? "success" : "warning"} className="text-[10px] uppercase font-bold">{order.order_status.replace(/_/g, " ")}</Badge>
                    {order.proofs && order.proofs.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-pink-50 px-2 py-0.5 rounded-full"><Camera className="h-3 w-3" /> {order.proofs.length} Proof Photo(s)</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                    <span>Pickup: {order.pickup_date} ({order.pickup_slot})</span><span>•</span>
                    <span>{order.pricing_mode === "per_bag" ? `${order.bag_count || 1} Bag(s)` : order.pricing_mode === "package" ? "Package Credits" : `${order.final_weight_lbs || order.estimated_weight_lbs || 15} lbs`}</span><span>•</span>
                    <span>Total: <strong className="text-slate-900 font-bold">{formatCurrency(order.total_amount)}</strong></span>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="border-pink-200 text-primary hover:bg-pink-50 text-xs self-start md:self-auto">View Details &amp; Proofs</Button>
              </div>
            ))}
          </div>
          <CustomerOrderDetailModal order={selectedOrder} isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} />
        </div>
      )}
      {isAdmin && (
        <ManualOrderModal
          isOpen={isManualModalOpen}
          onClose={() => setIsManualModalOpen(false)}
          onOrderCreated={(newOrder) => {
            setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
          }}
        />
      )}
    </DashboardPageLayout>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { PlusCircle, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardPageLayout } from "@/components/dashboard/dashboard-page-layout";
import { useAuth } from "@/context/auth-context";
import { AdminOverview } from "@/components/admin/admin-overview";
import { CustomerOverview } from "@/components/dashboard/customer-overview";
import { ManualOrderModal } from "@/components/admin/manual-order-modal";
import { useOrdersRealtime } from "@/hooks/use-orders-realtime";
import type { Order } from "@/types";
import type { CustomerAccount } from "@/components/admin/customer-detail-modal";

export default function DashboardOverviewMasterPage() {
  const { user, isAdmin } = useAuth();
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [customers, setCustomers] = React.useState<CustomerAccount[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isManualModalOpen, setIsManualModalOpen] = React.useState(false);

  const fetchOrders = React.useCallback(async () => {
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data?.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
      }
    } catch {}
  }, []);

  useOrdersRealtime({
    onEvent: (event) => {
      const isRelevant = isAdmin || (user && (event.userId === user.id || event.customerEmail === user.email))
        || orders.some((o) => o.id === event.orderId || o.order_number === event.orderNumber);
      if (isRelevant) void fetchOrders();
    },
  });

  React.useEffect(() => {
    const fetchPromises: Promise<unknown>[] = [
      fetch("/api/orders", { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data.orders)) setOrders(data.orders);
        })
        .catch(() => {}),
    ];

    if (isAdmin) {
      fetchPromises.push(
        fetch("/api/customers")
          .then((r) => r.json())
          .then((data) => {
            if (Array.isArray(data.customers)) setCustomers(data.customers);
          })
          .catch(() => {})
      );
    }

    Promise.all(fetchPromises).finally(() => setIsLoading(false));
  }, [isAdmin]);

  return (
    <DashboardPageLayout
      activeSection="overview"
      title={isAdmin ? "Operations Overview & Telemetry" : "Customer Dashboard"}
      subtitle={
        isAdmin
          ? "Real-time sales metrics, completed order earnings, and incoming wash pipeline"
          : "Track your transaction totals, orders overview, and turnaround journey"
      }
      actions={
        !isAdmin ? (
          <Link href="/order">
            <Button size="sm" className="bg-primary hover:bg-primary-dark text-white text-xs h-8 shadow-xs font-bold">
              <PlusCircle className="h-3.5 w-3.5 mr-1" />
              <span>Book Pickup</span>
            </Button>
          </Link>
        ) : (
          <Button
            size="sm"
            onClick={() => setIsManualModalOpen(true)}
            className="bg-primary hover:bg-primary-dark text-white text-xs h-8 shadow-xs font-bold"
          >
            <PhoneCall className="h-3.5 w-3.5 mr-1" />
            <span>New Phone Order</span>
          </Button>
        )
      }
    >
      {isLoading ? (
        <div className="h-96 rounded-3xl bg-slate-100 animate-pulse" />
      ) : isAdmin ? (
        <AdminOverview orders={orders} customers={customers} />
      ) : (
        <CustomerOverview orders={orders} />
      )}
      {isAdmin && (
        <ManualOrderModal
          isOpen={isManualModalOpen}
          onClose={() => setIsManualModalOpen(false)}
          onOrderCreated={(newOrder) => {
            setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
            void fetchOrders();
          }}
        />
      )}
    </DashboardPageLayout>
  );
}

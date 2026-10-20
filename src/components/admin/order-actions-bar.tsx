"use client";

import * as React from "react";
import { Edit3, Trash2, CreditCard, Scale, AlertTriangle, CheckCircle2, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { toast } from "@/components/ui/toast";
import { OrderCancelButton } from "./order-cancel-button";
import { OrderEditModal } from "./order-edit-modal";
import type { Order, OrderStatus } from "@/types";

interface OrderActionsBarProps {
  order: Order;
  onClose: () => void;
  onUpdateStatus?: (orderId: string, newStatus: OrderStatus, reason?: string, notes?: string) => Promise<boolean>;
  onOpenProofModal?: (order: Order, type: "pickup" | "dropoff" | "damage") => void;
  onWeighOrder?: (order: Order) => void;
  onOrderUpdated?: (order: Order) => void;
  onOrderDeleted?: (orderId: string) => void;
}

export function OrderActionsBar({
  order,
  onClose,
  onUpdateStatus,
  onOpenProofModal,
  onWeighOrder,
  onOrderUpdated,
  onOrderDeleted,
}: OrderActionsBarProps) {
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [isActionLoading, setIsActionLoading] = React.useState(false);

  const isCompletedOrCancelled = order.order_status === "completed" || order.order_status === "cancelled";
  const hasCardOnFile = Boolean(order.stripe_customer_id && (order.stripe_payment_method_id || order.card_last4));
  const isPaid = order.payment_status === "paid";

  const handleChargeCard = async () => {
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/charge-card`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: order.total_amount }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to charge card.");
      toast.success("Card charged successfully! Receipt emailed to customer.");
      if (data.order && onOrderUpdated) onOrderUpdated(data.order);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to charge card.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to delete order.");
      toast.success(`Order #${order.order_number} was permanently deleted.`);
      setIsDeleteOpen(false);
      if (onOrderDeleted) onOrderDeleted(order.id);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to delete order.");
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="space-y-3 pt-3 border-t border-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Edit / Convert is strictly hidden for completed or cancelled orders */}
          {!isCompletedOrCancelled && (
            <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)} className="text-slate-700">
              <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit / Convert
            </Button>
          )}

          {!isPaid && hasCardOnFile && !isCompletedOrCancelled && (
            <Button
              variant="hero"
              size="sm"
              disabled={isActionLoading}
              onClick={handleChargeCard}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              <CreditCard className="h-3.5 w-3.5 mr-1" /> Charge Card (${order.total_amount.toFixed(2)})
            </Button>
          )}

          {!isPaid && !isCompletedOrCancelled && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const url = `${window.location.origin}/order/pay/${order.order_number}`;
                await navigator.clipboard.writeText(url);
                toast.success("Payment checkout link copied to clipboard!");
              }}
              className="text-sky-700 border-sky-200 hover:bg-sky-50 font-bold"
            >
              <LinkIcon className="h-3.5 w-3.5 mr-1" /> Copy Payment Link
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            disabled={isActionLoading}
            onClick={() => setIsDeleteOpen(true)}
            className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Weigh & Charge is only for active, uncompleted, weighed-by-pound orders */}
          {onWeighOrder && !isCompletedOrCancelled && order.pricing_mode === "per_lb" && !isPaid && (
            <Button
              variant="hero"
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => { onClose(); onWeighOrder(order); }}
            >
              <Scale className="h-3.5 w-3.5 mr-1 shrink-0" /> Weigh &amp; Charge
            </Button>
          )}

          {onOpenProofModal && order.order_status === "in_wash" && (
            <Button
              variant="outline"
              size="sm"
              className="text-rose-600 border-rose-200 hover:bg-rose-50"
              onClick={() => { onClose(); onOpenProofModal(order, "damage"); }}
            >
              <AlertTriangle className="h-3.5 w-3.5 mr-1 shrink-0" /> Report Damage
            </Button>
          )}

          {onUpdateStatus && order.order_status === "confirmed" && (
            <Button
              variant="hero"
              size="sm"
              disabled={isActionLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => onUpdateStatus(order.id, "driver_assigned")}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1 shrink-0" /> Accept Order
            </Button>
          )}

          {onUpdateStatus && !isCompletedOrCancelled && (
            <OrderCancelButton
              order={order}
              disabled={isActionLoading}
              onCancel={(reason, notes) => onUpdateStatus(order.id, "cancelled", reason, notes)}
            />
          )}

          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>

      {!isCompletedOrCancelled && (
        <OrderEditModal
          order={order}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onOrderUpdated={(up) => { if (onOrderUpdated) onOrderUpdated(up); setIsEditOpen(false); }}
        />
      )}

      {/* Custom Confirmation Modal for Deletion (No window.confirm) */}
      <ConfirmModal
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={handleDelete}
        title={`Delete Order #${order.order_number}?`}
        description="This will permanently delete this order and all associated delivery proof photos from storage. This action cannot be undone."
        confirmText="Delete Order"
        isLoading={isActionLoading}
      />
    </div>
  );
}

import type { Order } from "@/types";
import type { UnifiedInvoiceInput } from "./invoice-html-template";
import { formatSlotLabel, resolveDetergentName } from "@/lib/utils";

export interface InvoiceMapperOptions {
  slotTimes?: { s1?: string; e1?: string; s2?: string; e2?: string };
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  transactionId?: string;
  address?: string;
}

export function orderToUnifiedInvoice(
  order: Order,
  options?: InvoiceMapperOptions
): UnifiedInvoiceInput {
  const fullAddress =
    options?.address ||
    [
      order.street_address,
      order.apt_unit ? `Apt ${order.apt_unit}` : "",
      order.city,
      order.state,
      order.zip_code,
    ]
      .filter(Boolean)
      .join(", ") ||
    order.pickup_address ||
    "Doorstep Address";

  const slotTimes = options?.slotTimes;
  const slotLabel =
    slotTimes?.s1 &&
    slotTimes?.e1 &&
    slotTimes?.s2 &&
    slotTimes?.e2 &&
    (order.pickup_slot === "8am-12pm" || order.pickup_slot === "1pm-6pm")
      ? formatSlotLabel(
          order.pickup_slot as "8am-12pm" | "1pm-6pm",
          slotTimes.s1,
          slotTimes.e1,
          slotTimes.s2,
          slotTimes.e2
        )
      : order.pickup_slot || "Scheduled Window";

  const planLabel =
    order.pricing_mode === "per_bag"
      ? "By The Bag Wash & Fold (13 Gal)"
      : order.pricing_mode === "package"
        ? (order.package_name ? `${order.package_name}` : "Wash & Fold Package Plan")
        : "By The Pound (lb) Wash & Fold";

  const quantityLabel =
    order.pricing_mode === "per_bag"
      ? `${order.bag_count || 1} Bag(s) (13 Gal each)`
      : order.pricing_mode === "package"
        ? (order.bag_count > 0 ? `${order.bag_count} Bag(s) Included` : `${order.final_weight_lbs || order.estimated_weight_lbs || 0} lbs Included`)
        : `${order.final_weight_lbs || order.estimated_weight_lbs || 15} lbs`;

  const orderDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

  const methodDisplay =
    order.payment_method === "card"
      ? "Credit / Debit Card (Stripe)"
      : order.payment_method === "apple_pay"
        ? "Apple Pay (Stripe)"
        : order.payment_method === "google_pay"
          ? "Google Pay (Stripe)"
          : order.payment_method || "Stripe 256-Bit Secure Checkout";

  const detergentName = order.detergent_name || resolveDetergentName(order.detergent_id);
  const doorstepProtocol = order.is_out_of_home
    ? "Away — Contactless Doorstep"
    : "Home — Driver Rings Bell";
  const specialRequest = order.customer_notes
    ? `${doorstepProtocol} (${order.customer_notes})`
    : doorstepProtocol;

  const orderId = order.order_number || "LX-ORDER";
  const transactionId =
    options?.transactionId ||
    order.stripe_payment_intent ||
    `STRIPE-TX-${orderId.replace(/[^A-Za-z0-9]/g, "").slice(-8).toUpperCase()}`;

  return {
    orderId,
    orderNumber: orderId,
    orderDate,
    pickupDate: order.pickup_date,
    pickupSlot: slotLabel,
    deliveryDate: order.delivery_date || "Within 24 Hours",
    paymentMethod: methodDisplay,
    totalAmount: Number(order.total_amount || 0),
    subtotal: Number(order.subtotal || order.total_amount || 0),
    detergentFee: Number(order.detergent_fee || 0),
    deliveryFee: Number(order.delivery_fee || 0),
    discountAmount: Number(order.discount_amount || 0),
    transactionId,
    customerName: options?.customerName || order.customer_name || "Valued Customer",
    customerEmail: options?.customerEmail || order.customer_email || "",
    customerPhone: options?.customerPhone || order.customer_phone || undefined,
    address: fullAddress,
    planName: planLabel,
    quantity: quantityLabel,
    detergent: detergentName,
    specialRequest,
    orderDetails: {
      planName: planLabel,
      quantity: quantityLabel,
      detergent: detergentName,
      specialRequest,
    },
    orderCancelled: order.order_status === "cancelled",
  };
}

/** Legacy alias for backwards compatibility */
export const orderToInvoiceData = orderToUnifiedInvoice;

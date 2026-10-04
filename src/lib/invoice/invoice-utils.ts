import type { Order } from "@/types";
import type { InvoiceData } from "@/components/booking/order-invoice-modal";
import { formatSlotLabel, resolveDetergentName } from "@/lib/utils";

export function orderToInvoiceData(
  order: Order,
  slotTimes?: { s1?: string; e1?: string; s2?: string; e2?: string }
): InvoiceData {
  const fullAddress =
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
        ? "Saver Package Credit"
        : "By The Pound (lb) Wash & Fold";

  const quantityLabel =
    order.pricing_mode === "per_bag"
      ? `${order.bag_count || 1} Bag(s)`
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

  return {
    orderId: order.order_number,
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
    transactionId: order.stripe_payment_intent || undefined,
    customerName: order.customer_name || "Valued Customer",
    customerEmail: order.customer_email || "",
    customerPhone: order.customer_phone || "",
    address: fullAddress,
    orderDetails: {
      planName: planLabel,
      quantity: quantityLabel,
      detergent: order.detergent_name || resolveDetergentName(order.detergent_id),
      specialRequest: order.is_out_of_home
        ? "Away — Contactless Doorstep Pickup"
        : "Home — Driver Rings Bell",
    },
  };
}

import type Stripe from "stripe";
import { stripe } from "@/lib/stripe/stripe-server";
import { OrderService } from "@/lib/services/order-service";
import { OrderBillingService } from "@/lib/services/order-billing-service";
import { ContentService } from "@/lib/services/content-service";
import { broadcastOrderEvent } from "@/lib/services/order-realtime-service";
import { sendInvoiceEmail, type InvoiceEmailPayload } from "@/lib/services/email-service";
import { orderToUnifiedInvoice } from "@/lib/invoice/invoice-utils";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Order } from "@/types";

export async function sendInvoiceForSession(order: Order, session: Stripe.Checkout.Session, txId?: string) {
  if (!order.customer_email || order.customer_email.includes("@call.laundryexpress.local")) return;
  try {
    const settings = await ContentService.getSettings();
    const invoicePayload = orderToUnifiedInvoice(order, {
      slotTimes: settings ? { s1: settings.slot1_start, e1: settings.slot1_end, s2: settings.slot2_start, e2: settings.slot2_end } : undefined,
      customerName: session.customer_details?.name || order.customer_name,
      customerEmail: session.customer_details?.email || order.customer_email,
      transactionId: txId || order.stripe_payment_intent || undefined,
    });
    await sendInvoiceEmail(invoicePayload as unknown as InvoiceEmailPayload);
    await OrderService.markInvoiceEmailSent(order.id);
  } catch (err) {
    console.error(`[stripe-webhook] Invoice dispatch failed for ${order.order_number}:`, err);
  }
}

export async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { order_id, order_number } = session.metadata || {};
  const identifier = order_number || order_id;
  if (!identifier) throw new Error("checkout.session.completed missing order metadata.");

  if (session.mode === "setup" || session.metadata?.checkout_type === "initial_tip_delivery" || session.metadata?.checkout_type === "card_setup") {
    const order = await OrderService.getOrderByNumber(identifier);
    if (!order) throw new Error(`Order ${identifier} not found for setup session.`);

    let customerId = typeof session.customer === "string" ? session.customer : session.customer?.id || "";
    let paymentMethodId = "";
    let paymentIntentId = "";
    let cardBrand = "card";
    let cardLast4 = "";

    if (session.mode === "setup") {
      const setupIntentId = typeof session.setup_intent === "string" ? session.setup_intent : session.setup_intent?.id;
      if (setupIntentId && stripe) {
        const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
        paymentMethodId = typeof setupIntent.payment_method === "string" ? setupIntent.payment_method : setupIntent.payment_method?.id || "";
      }
    } else {
      paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || "";
      if (paymentIntentId && stripe) {
        try {
          const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
          if (!customerId && pi.customer) customerId = typeof pi.customer === "string" ? pi.customer : pi.customer.id;
          paymentMethodId = typeof pi.payment_method === "string" ? pi.payment_method : pi.payment_method?.id || "";
        } catch {}
      }
    }

    if (paymentMethodId && stripe) {
      try {
        const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
        cardBrand = pm.card?.brand || "card";
        cardLast4 = pm.card?.last4 || "";
      } catch {}
    }

    const updatedOrder = await OrderBillingService.recordCardAuthorized(order.id, {
      stripeCustomerId: customerId,
      stripePaymentMethodId: paymentMethodId,
      cardBrand,
      cardLast4,
      deliveryFeePaid: true,
      tipPaid: true,
      initialPaidAmount: (session.amount_total || 0) / 100,
    });
    if (paymentIntentId) {
      await createAdminSupabaseClient().from("orders").update({ stripe_payment_intent_id: paymentIntentId }).eq("id", order.id);
    }

    const finalOrder = (await OrderService.getOrderByNumber(order.id)) || updatedOrder || order;
    await sendInvoiceForSession(finalOrder, session, paymentIntentId);
    return;
  }

  if (session.payment_status !== "paid") return;

  const order = await OrderService.getOrderByNumber(identifier);
  if (!order) throw new Error(`Paid order ${identifier} was not found.`);

  const expectedAmount = Math.round(Number(order.total_amount) * 100);
  if (session.currency !== "usd" || session.amount_total !== expectedAmount) {
    throw new Error(`Stripe payment amount does not match order ${identifier}.`);
  }

  let finalOrder = order;
  if (order.payment_status !== "paid") {
    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
    let customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
    let paymentMethodId = "";
    let cardBrand = "card";
    let cardLast4 = "";

    if (paymentIntentId && stripe) {
      try {
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (!customerId && pi.customer) customerId = typeof pi.customer === "string" ? pi.customer : pi.customer.id;
        paymentMethodId = typeof pi.payment_method === "string" ? pi.payment_method : pi.payment_method?.id || "";
        if (paymentMethodId) {
          const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
          cardBrand = pm.card?.brand || "card";
          cardLast4 = pm.card?.last4 || "";
        }
      } catch {}
    }

    const updatedOrder = await OrderService.markOrderPaid(order.id, {
      stripe_payment_intent_id: paymentIntentId,
      customer_name: session.customer_details?.name || order.customer_name,
      customer_email: session.customer_details?.email || order.customer_email,
      payment_method: "card",
    });
    if (!updatedOrder) throw new Error(`Could not confirm paid order ${identifier}.`);
    finalOrder = updatedOrder;

    if (customerId || paymentMethodId) {
      await createAdminSupabaseClient().from("orders").update({
        ...(customerId ? { stripe_customer_id: customerId } : {}),
        ...(paymentMethodId ? { stripe_payment_method_id: paymentMethodId } : {}),
        ...(cardBrand ? { card_brand: cardBrand } : {}),
        ...(cardLast4 ? { card_last4: cardLast4 } : {}),
      }).eq("id", order.id);
      finalOrder = (await OrderService.getOrderByNumber(order.id)) || finalOrder;
    }

    try {
      await createAdminSupabaseClient().rpc("increment_coupon_usage_for_order", { order_id_input: order.id });
    } catch {}
  }

  await sendInvoiceForSession(finalOrder, session, typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id);
}

export async function handlePaymentIntentSucceeded(pi: Stripe.PaymentIntent) {
  const orderIdentifier = pi.metadata?.order_number || pi.metadata?.order_id;
  let order: Order | null = null;
  if (orderIdentifier) {
    order = await OrderService.getOrderByNumber(orderIdentifier);
  } else {
    const { data } = await createAdminSupabaseClient().from("orders").select("*").eq("stripe_payment_intent_id", pi.id).maybeSingle();
    if (data) order = await OrderService.getOrderByNumber(data.id);
  }
  if (!order) return;

  const nextStatus = (order.order_status === "confirmed" || order.order_status === "driver_assigned" || order.order_status === "picked_up")
    ? "in_wash"
    : order.order_status;

  await createAdminSupabaseClient().from("orders").update({
    payment_status: "paid",
    stripe_payment_intent_id: pi.id,
    order_status: nextStatus,
    updated_at: new Date().toISOString(),
  }).eq("id", order.id);

  void broadcastOrderEvent({
    eventType: "order_paid",
    orderId: order.id,
    orderNumber: order.order_number,
    orderStatus: nextStatus,
    paymentStatus: "paid",
    totalAmount: order.total_amount,
    customerEmail: order.customer_email,
    customerName: order.customer_name,
    updatedAt: new Date().toISOString(),
  });
}

export async function handlePaymentIntentFailed(pi: Stripe.PaymentIntent) {
  const orderIdentifier = pi.metadata?.order_number || pi.metadata?.order_id;
  let order: Order | null = null;
  if (orderIdentifier) {
    order = await OrderService.getOrderByNumber(orderIdentifier);
  } else {
    const { data } = await createAdminSupabaseClient().from("orders").select("*").eq("stripe_payment_intent_id", pi.id).maybeSingle();
    if (data) order = await OrderService.getOrderByNumber(data.id);
  }
  if (!order) return;

  const failureReason = pi.last_payment_error?.message || "Card declined / Insufficient funds.";
  const currentAddr = (order.pickup_address && typeof order.pickup_address === "object") ? (order.pickup_address as Record<string, unknown>) : {};
  const updatedAddr = { ...currentAddr, payment_error: failureReason };

  await createAdminSupabaseClient().from("orders").update({
    payment_status: "failed",
    pickup_address: updatedAddr,
    updated_at: new Date().toISOString(),
  }).eq("id", order.id);

  void broadcastOrderEvent({
    eventType: "order_status_updated",
    orderId: order.id,
    orderNumber: order.order_number,
    orderStatus: order.order_status,
    totalAmount: order.total_amount,
    customerEmail: order.customer_email,
    customerName: order.customer_name,
    updatedAt: new Date().toISOString(),
  });
}

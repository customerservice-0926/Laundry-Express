import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe/stripe-server";
import { OrderService } from "@/lib/services/order-service";
import { OrderBillingService } from "@/lib/services/order-billing-service";
import { ContentService } from "@/lib/services/content-service";
import { sendInvoiceEmail, type InvoiceEmailPayload } from "@/lib/services/email-service";
import { orderToUnifiedInvoice } from "@/lib/invoice/invoice-utils";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeSecret || !webhookSecret || !stripe) {
    console.error("[stripe-webhook] Stripe is not configured.");
    return NextResponse.json({ error: "Payment webhook is not configured." }, { status: 503 });
  }
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.arrayBuffer();
    event = stripe.webhooks.constructEvent(Buffer.from(rawBody), sig, webhookSecret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Webhook signature verification failed";
    console.error("[stripe-webhook] signature failed:", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const { error: claimError } = await supabase.from("stripe_webhook_events").insert({ event_id: event.id });
  if (claimError) {
    if (claimError.code === "23505") {
      return NextResponse.json({ received: true, deduplicated: true });
    }
    return NextResponse.json({ error: "Could not claim webhook event" }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "checkout.session.expired": {
        const expired = event.data.object as Stripe.Checkout.Session;
        const identifier = expired.metadata?.order_number || expired.metadata?.order_id;
        if (identifier) await OrderService.markOrderPaymentFailed(identifier);
        break;
      }
      default:
        break;
    }
  } catch (processingError: unknown) {
    const msg = processingError instanceof Error ? processingError.message : "Processing failed";
    console.error(`[stripe-webhook] failed to process ${event.type}:`, msg);
    try {
      await supabase.from("stripe_webhook_events").delete().eq("event_id", event.id);
    } catch (releaseError) {
      console.error("[stripe-webhook] could not release failed event:", releaseError);
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { order_id, order_number } = session.metadata || {};
  const identifier = order_number || order_id;
  if (!identifier) {
    throw new Error("checkout.session.completed is missing order metadata.");
  }

  // Handle Per-Pound Setup Mode (Card Authorized on File)
  if (session.mode === "setup") {
    const order = await OrderService.getOrderByNumber(identifier);
    if (!order) throw new Error(`Order ${identifier} not found for setup session.`);

    const setupIntentId = typeof session.setup_intent === "string" ? session.setup_intent : session.setup_intent?.id;
    const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id || "";
    let paymentMethodId = "";
    let cardBrand = "card";
    let cardLast4 = "";

    if (setupIntentId && stripe) {
      const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
      paymentMethodId = typeof setupIntent.payment_method === "string" ? setupIntent.payment_method : setupIntent.payment_method?.id || "";
      if (paymentMethodId) {
        const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
        cardBrand = pm.card?.brand || "card";
        cardLast4 = pm.card?.last4 || "";
      }
    }

    await OrderBillingService.recordCardAuthorized(order.id, {
      stripeCustomerId: customerId,
      stripePaymentMethodId: paymentMethodId,
      cardBrand,
      cardLast4,
    });
    console.info(`[stripe-webhook] Card verified & saved for per-pound order ${order.order_number}`);
    return;
  }

  // Handle Standard Immediate Payment (Bags / Packages)
  if (session.payment_status !== "paid") return;

  const order = await OrderService.getOrderByNumber(identifier);
  if (!order) throw new Error(`Paid order ${identifier} was not found.`);

  const expectedAmount = Math.round(Number(order.total_amount) * 100);
  if (session.currency !== "usd" || session.amount_total !== expectedAmount) {
    throw new Error(`Stripe payment amount does not match order ${identifier}.`);
  }
  if (order.payment_status === "paid") {
    const { error } = await createAdminSupabaseClient().rpc("increment_coupon_usage_for_order", {
      order_id_input: order.id,
    });
    if (error) throw new Error(`Unable to record coupon use: ${error.message}`);
  }

  if (order.payment_status === "paid" && order.invoice_email_sent_at) {
    console.info("[stripe-webhook] paid order invoice already sent:", identifier);
    return;
  }

  let finalOrder = order;
  if (order.payment_status !== "paid") {
    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
    const updatedOrder = await OrderService.markOrderPaid(order.id, {
      stripe_payment_intent_id: paymentIntentId,
      customer_name: session.customer_details?.name || order.customer_name,
      customer_email: session.customer_details?.email || order.customer_email,
      payment_method: "card",
    });
    if (!updatedOrder) throw new Error(`Could not confirm paid order ${identifier}.`);
    finalOrder = updatedOrder;
    const { error } = await createAdminSupabaseClient().rpc("increment_coupon_usage_for_order", {
      order_id_input: order.id,
    });
    if (error) throw new Error(`Unable to record coupon use: ${error.message}`);
  }

  // Generate and dispatch official invoice email to customer and admin
  try {
    const settings = await ContentService.getSettings();
    const invoicePayload = orderToUnifiedInvoice(finalOrder, {
      slotTimes: settings
        ? { s1: settings.slot1_start, e1: settings.slot1_end, s2: settings.slot2_start, e2: settings.slot2_end }
        : undefined,
      customerName: session.customer_details?.name || finalOrder.customer_name,
      customerEmail: session.customer_details?.email || finalOrder.customer_email,
      transactionId:
        (typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id) ||
        finalOrder.stripe_payment_intent ||
        undefined,
    });

    if (!invoicePayload.customerEmail) {
      throw new Error(`No customer email is available for paid order ${identifier}.`);
    }

    await sendInvoiceEmail(invoicePayload as unknown as InvoiceEmailPayload);
    await OrderService.markInvoiceEmailSent(finalOrder.id);
    console.info(`[stripe-webhook] Payment captured and invoice emailed for order ${finalOrder.order_number}`);
  } catch (emailErr: unknown) {
    console.error("[stripe-webhook] Invoice email dispatch failed:", emailErr);
    throw emailErr;
  }
}

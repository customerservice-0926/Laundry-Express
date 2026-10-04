import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { OrderService } from "@/lib/services/order-service";
import { ContentService } from "@/lib/services/content-service";
import { sendInvoiceEmail, type InvoiceEmailPayload } from "@/lib/services/email-service";
import { orderToUnifiedInvoice } from "@/lib/invoice/invoice-utils";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeSecret || !webhookSecret) {
    console.error("[stripe-webhook] Stripe secrets are not configured.");
    return NextResponse.json({ error: "Payment webhook is not configured." }, { status: 503 });
  }
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const stripe = new Stripe(stripeSecret, {
    // @ts-expect-error -- Pin the API version used by this integration.
    apiVersion: "2024-12-18.acacia",
  });

  let event: Stripe.Event;
  try {
    const rawBody = await req.arrayBuffer();
    event = stripe.webhooks.constructEvent(Buffer.from(rawBody), sig, webhookSecret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Webhook signature verification failed";
    console.error("[stripe-webhook] signature error:", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    const supabase = createAdminSupabaseClient();
    const { data: claimed, error: claimError } = await supabase.rpc("claim_stripe_webhook_event", {
        event_id_input: event.id,
        event_type_input: event.type,
      });
    if (claimError) throw new Error(`Unable to claim Stripe event: ${claimError.message}`);
    if (!claimed) return NextResponse.json({ received: true, idempotent: true });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.warn("[stripe-webhook] payment failed for intent:", pi.id, pi.last_payment_error?.message);
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.info("[stripe-webhook] checkout session expired:", session.id);
        const orderNumber = session.metadata?.order_number;
        if (orderNumber) await OrderService.markOrderPaymentFailed(orderNumber);
        break;
      }
      default:
        break;
    }

    const { data, error } = await supabase.from("stripe_webhook_events")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("event_id", event.id).select("event_id").maybeSingle();
    if (error || !data) throw new Error(`Unable to complete Stripe event: ${error?.message || "Event claim missing."}`);
  } catch (handlerErr: unknown) {
    const msg = handlerErr instanceof Error ? handlerErr.message : "Webhook handler error";
    console.error("[stripe-webhook] processing error:", msg);
    try {
      const supabase = createAdminSupabaseClient();
      const { error } = await supabase.from("stripe_webhook_events")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("event_id", event.id);
      if (error) console.error("[stripe-webhook] could not release failed event:", error.message);
    } catch (releaseError) {
      console.error("[stripe-webhook] could not release failed event:", releaseError);
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return;

  const { order_id, order_number } = session.metadata || {};
  const identifier = order_number || order_id;
  if (!identifier) {
    throw new Error("checkout.session.completed is missing order metadata.");
  }

  const order = await OrderService.getOrderByNumber(identifier);
  if (!order) {
    throw new Error(`Paid order ${identifier} was not found.`);
  }
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

  // 2. Generate and dispatch official invoice email to customer and admin
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

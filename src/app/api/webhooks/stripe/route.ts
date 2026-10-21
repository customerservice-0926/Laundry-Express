import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe/stripe-server";
import { OrderService } from "@/lib/services/order-service";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  handleCheckoutCompleted,
  handlePaymentIntentSucceeded,
  handlePaymentIntentFailed,
} from "@/lib/services/stripe-webhook-handler";

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
  let isDeduplicated = false;
  try {
    const { error: claimError } = await supabase.from("stripe_webhook_events").insert({
      event_id: event.id,
      event_type: event.type,
      status: "processing",
      lease_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });

    if (claimError) {
      if (claimError.code === "23505") isDeduplicated = true;
      else console.warn("[stripe-webhook] Claim notification:", claimError.message);
    }
  } catch (claimEx) {
    console.warn("[stripe-webhook] Event claim fallback:", claimEx);
  }

  if (isDeduplicated) return NextResponse.json({ received: true, deduplicated: true });

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
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      default:
        break;
    }

    try {
      await supabase.from("stripe_webhook_events").update({ status: "completed" }).eq("event_id", event.id);
    } catch {}
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

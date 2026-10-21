import { stripe } from "@/lib/stripe/stripe-server";
import { OrderService } from "@/lib/services/order-service";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { sendPaymentCheckoutEmail } from "@/lib/services/email-service";
import type { Order } from "@/types";

export interface CreatePaymentLinkResult {
  sessionId: string;
  checkoutUrl: string;
  stripeUrl: string | null;
  expiresAt: string;
  emailSent: boolean;
  order: Order;
}

export class OrderPaymentLinkService {
  /**
   * Generates a 30-minute valid checkout session with session in query params,
   * attaches Stripe customer, and dispatches payment checkout email to customer.
   */
  static async createAndSendPaymentLink(
    orderIdentifier: string,
    origin: string,
    options?: { sendEmail?: boolean; expiresInMinutes?: number }
  ): Promise<CreatePaymentLinkResult> {
    if (!stripe) throw new Error("Stripe payment gateway is not configured.");
    const order = await OrderService.getOrderByNumber(orderIdentifier);
    if (!order) throw new Error("Order not found.");

    if (order.payment_method === "cash") {
      throw new Error(`Order #${order.order_number} is a Cash payment order. Online payment links are not applicable.`);
    }

    if (order.payment_status === "paid") {
      throw new Error(`Order #${order.order_number} is already paid.`);
    }

    const minutes = options?.expiresInMinutes || 30;
    const expiresAtUnix = Math.floor(Date.now() / 1000) + minutes * 60;

    let customerId = order.stripe_customer_id;
    if (!customerId && order.customer_email) {
      const existing = await stripe.customers.list({ email: order.customer_email, limit: 1 });
      if (existing.data.length > 0) {
        customerId = existing.data[0].id;
      } else {
        const created = await stripe.customers.create({
          email: order.customer_email,
          name: order.customer_name || order.customer_email,
          metadata: { order_id: order.id, order_number: order.order_number },
        });
        customerId = created.id;
      }
    }

    const deliveryFee = Math.max(0, Number(order.delivery_fee || 0));
    const tipAmount = Math.max(0, Number(order.tip_amount || 0));
    const initialPayable = Math.max(0, Math.round((deliveryFee + tipAmount) * 100) / 100);
    let session;

    if (initialPayable > 0) {
      const lineItems = [];
      if (deliveryFee > 0) {
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: {
              name: `Delivery Fee — Order #${order.order_number}`,
              description: `Doorstep Pickup & Delivery Logistics (${order.distance_miles ? `~${order.distance_miles} mi` : "Standard Zone"})`,
            },
            unit_amount: Math.round(deliveryFee * 100),
          },
          quantity: 1,
        });
      }
      if (tipAmount > 0) {
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: {
              name: "Driver & Crew Gratuity (Tip)",
              description: "Customer tip for prompt and careful delivery",
            },
            unit_amount: Math.round(tipAmount * 100),
          },
          quantity: 1,
        });
      }

      session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        customer: customerId || undefined,
        customer_email: !customerId ? order.customer_email || undefined : undefined,
        customer_update: customerId ? { address: "auto", name: "auto" } : undefined,
        expires_at: expiresAtUnix,
        line_items: lineItems,
        success_url: `${origin}/order/success?order_id=${order.order_number}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/order/pay/${order.order_number}`,
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
          checkout_type: "initial_tip_delivery",
          delivery_fee: String(deliveryFee),
          tip_amount: String(tipAmount),
        },
        payment_intent_data: {
          setup_future_usage: "off_session",
          metadata: { order_id: order.id, order_number: order.order_number },
        },
      });
    } else {
      session = await stripe.checkout.sessions.create({
        mode: "setup",
        payment_method_types: ["card"],
        customer: customerId || undefined,
        customer_email: !customerId ? order.customer_email || undefined : undefined,
        expires_at: expiresAtUnix,
        success_url: `${origin}/order/success?order_id=${order.order_number}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/order/pay/${order.order_number}`,
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
          checkout_type: "initial_tip_delivery",
          delivery_fee: "0",
          tip_amount: "0",
        },
      });
    }

    const checkoutUrl = `${origin}/order/pay/${order.order_number}?session_id=${session.id}`;
    const supabase = createAdminSupabaseClient();
    await supabase
      .from("orders")
      .update({
        stripe_checkout_session_id: session.id,
        stripe_customer_id: customerId || undefined,
        card_setup_link: checkoutUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    let emailSent = false;
    if (options?.sendEmail !== false && order.customer_email && !order.customer_email.includes("@call.laundryexpress.local")) {
      try {
        await sendPaymentCheckoutEmail({
          orderNumber: order.order_number,
          customerName: order.customer_name || "Valued Customer",
          customerEmail: order.customer_email,
          totalAmount: order.total_amount,
          checkoutUrl,
          pickupDate: order.pickup_date || "",
          pickupSlot: order.pickup_slot || "",
          planName: order.pricing_mode === "package" ? "Saver Package" : `${order.bag_count || 1} Bag(s) Wash & Fold`,
          expiresInMinutes: minutes,
        });
        emailSent = true;
      } catch (err) {
        console.error("[OrderPaymentLinkService] Failed to send payment email:", err);
      }
    }

    const refreshed = (await OrderService.getOrderByNumber(order.id)) || order;
    return {
      sessionId: session.id,
      checkoutUrl,
      stripeUrl: session.url,
      expiresAt: new Date(expiresAtUnix * 1000).toISOString(),
      emailSent,
      order: refreshed,
    };
  }
}

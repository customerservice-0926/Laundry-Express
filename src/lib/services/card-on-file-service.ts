import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/stripe-server";
import { OrderService } from "@/lib/services/order-service";
import { ContentService } from "@/lib/services/content-service";
import { broadcastOrderEvent } from "@/lib/services/order-realtime-service";
import { sendInvoiceEmail, type InvoiceEmailPayload } from "@/lib/services/email-service";
import { orderToUnifiedInvoice } from "@/lib/invoice/invoice-utils";
import type { Order } from "@/types";

export class CardOnFileService {
  /**
   * Generates a secure Stripe Setup Session URL for a customer to add their card on file.
   */
  static async createCardSetupLink(orderId: string, origin: string): Promise<string> {
    if (!stripe) throw new Error("Stripe is not configured.");
    const order = await OrderService.getOrderByNumber(orderId);
    if (!order) throw new Error("Order not found.");

    const email = order.customer_email || `customer-${order.id}@laundryexpressservices.com`;
    const name = order.customer_name || "Valued Customer";

    // 1. Get or create Stripe Customer
    let customerId = order.stripe_customer_id;
    if (!customerId) {
      const existing = await stripe.customers.list({ email, limit: 1 });
      if (existing.data.length > 0) {
        customerId = existing.data[0].id;
      } else {
        const created = await stripe.customers.create({
          email,
          name,
          metadata: { order_id: order.id, order_number: order.order_number },
        });
        customerId = created.id;
      }
    }

    // 2. Create Stripe Checkout Session in setup mode
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "setup",
      customer: customerId,
      success_url: `${origin}/order/success?session_id={CHECKOUT_SESSION_ID}&order_id=${encodeURIComponent(order.order_number)}&setup=complete`,
      cancel_url: `${origin}/dashboard/orders?setup_cancelled=true`,
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
      },
    });

    const setupUrl = session.url || `${origin}/order`;

    // 3. Save setup link & customer ID to orders table
    const supabase = createAdminSupabaseClient();
    await supabase
      .from("orders")
      .update({
        stripe_customer_id: customerId,
        card_setup_link: setupUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    return setupUrl;
  }

  /**
   * Charges the customer's card on file off-session ("Cut Payment").
   */
  static async chargeCardOnFile(
    orderId: string,
    customAmount?: number,
    newTotalAmount?: number
  ): Promise<{ success: boolean; order?: Order; totalAmount?: number; error?: string }> {
    if (!stripe) return { success: false, error: "Stripe is not configured." };
    const order = await OrderService.getOrderByNumber(orderId);
    if (!order) return { success: false, error: "Order not found." };

    let customerId = order.stripe_customer_id;
    let paymentMethodId = order.stripe_payment_method_id;

    if (!customerId || !paymentMethodId) {
      const supabase = createAdminSupabaseClient();
      if (order.customer_email || order.user_id) {
        const query = supabase.from("orders").select("stripe_customer_id, stripe_payment_method_id, card_brand, card_last4").not("stripe_payment_method_id", "is", null);
        const { data: prev } = order.user_id
          ? await query.eq("user_id", order.user_id).order("created_at", { ascending: false }).limit(1).maybeSingle()
          : await query.eq("customer_email", order.customer_email).order("created_at", { ascending: false }).limit(1).maybeSingle();

        if (prev?.stripe_customer_id && prev?.stripe_payment_method_id) {
          customerId = prev.stripe_customer_id;
          paymentMethodId = prev.stripe_payment_method_id;
          await supabase.from("orders").update({
            stripe_customer_id: customerId, stripe_payment_method_id: paymentMethodId,
            card_brand: prev.card_brand, card_last4: prev.card_last4,
          }).eq("id", order.id);
        }
      }

      if (customerId && !paymentMethodId) {
        try {
          const pms = await stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 1 });
          if (pms.data.length > 0) {
            paymentMethodId = pms.data[0].id;
            await supabase.from("orders").update({
              stripe_payment_method_id: paymentMethodId,
              card_brand: pms.data[0].card?.brand || "card",
              card_last4: pms.data[0].card?.last4 || "",
            }).eq("id", order.id);
          }
        } catch {}
      }
    }

    if (!customerId || !paymentMethodId) {
      return {
        success: false,
        error: "No reusable card on file found for this customer. Please send them a card setup link or payment checkout link.",
      };
    }

    const amountToCharge = typeof customAmount === "number" && customAmount > 0
      ? customAmount
      : order.total_amount;

    if (amountToCharge <= 0) {
      return { success: false, error: "Charge amount must be greater than $0.00." };
    }

    const amountCents = Math.round(amountToCharge * 100);

    let paymentIntentId: string;
    try {
      const intent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: "usd",
        customer: customerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        description: `Laundry Express Order #${order.order_number} (Card on File Charge)`,
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
        },
      });
      paymentIntentId = intent.id;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Card payment failed.";
      return { success: false, error: `Stripe card charge failed: ${msg}` };
    }

    const finalTotal = typeof newTotalAmount === "number" && newTotalAmount > 0
      ? newTotalAmount
      : typeof customAmount === "number" && customAmount > 0
      ? Math.max(order.total_amount, customAmount)
      : order.total_amount;

    // Update order status to paid
    const supabase = createAdminSupabaseClient();
    const { data: updated, error: updateErr } = await supabase
      .from("orders")
      .update({
        total_amount: finalTotal,
        payment_status: "paid",
        stripe_payment_intent_id: paymentIntentId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .select("*, proofs:order_proofs(*)")
      .single();

    if (updateErr || !updated) {
      return { success: false, error: "Payment processed on Stripe but failed to update local order status." };
    }

    const finalOrder = await OrderService.getOrderByNumber(order.id);
    if (!finalOrder) return { success: true, totalAmount: amountToCharge };

    // Broadcast live event
    void broadcastOrderEvent({
      eventType: "order_paid",
      orderId: finalOrder.id,
      orderNumber: finalOrder.order_number,
      orderStatus: finalOrder.order_status,
      paymentStatus: "paid",
      totalAmount: amountToCharge,
      customerEmail: finalOrder.customer_email,
      customerName: finalOrder.customer_name,
      updatedAt: new Date().toISOString(),
    });

    // Send unified invoice email
    try {
      const settings = await ContentService.getSettings();
      const invoicePayload = orderToUnifiedInvoice(finalOrder, {
        slotTimes: settings
          ? { s1: settings.slot1_start, e1: settings.slot1_end, s2: settings.slot2_start, e2: settings.slot2_end }
          : undefined,
        transactionId: paymentIntentId,
      });
      if (invoicePayload.customerEmail) {
        await sendInvoiceEmail(invoicePayload as unknown as InvoiceEmailPayload);
        await OrderService.markInvoiceEmailSent(finalOrder.id);
      }
    } catch (emailErr) {
      console.warn("[CardOnFileService] Failed to send receipt email:", emailErr);
    }

    return { success: true, order: finalOrder, totalAmount: amountToCharge };
  }
}

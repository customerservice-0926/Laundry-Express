import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/stripe-server";
import { OrderService } from "@/lib/services/order-service";
import { PricingPlanService } from "@/lib/services/pricing-plan-service";
import { ContentService } from "@/lib/services/content-service";
import { broadcastOrderEvent } from "@/lib/services/order-realtime-service";
import { sendInvoiceEmail, type InvoiceEmailPayload } from "@/lib/services/email-service";
import { orderToUnifiedInvoice } from "@/lib/invoice/invoice-utils";
import type { Order } from "@/types";

export interface CardAuthDetails {
  stripeCustomerId: string;
  stripePaymentMethodId: string;
  cardBrand?: string;
  cardLast4?: string;
}

export class OrderBillingService {
  /**
   * Records verified payment method on file when customer authorizes card for per-pound orders.
   */
  static async recordCardAuthorized(orderId: string, details: CardAuthDetails): Promise<Order | null> {
    const supabase = createAdminSupabaseClient();
    let { data, error } = await supabase
      .from("orders")
      .update({
        stripe_customer_id: details.stripeCustomerId,
        stripe_payment_method_id: details.stripePaymentMethodId,
        card_brand: details.cardBrand || "card",
        card_last4: details.cardLast4 || "",
        payment_status: "authorized",
        order_status: "confirmed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .select("*, proofs:order_proofs(*)")
      .maybeSingle();

    // If database check constraint on payment_status does not yet permit 'authorized' (code 23514), fallback to storing card with payment_status preserved
    if (error && error.code === "23514") {
      console.warn("[billing-service] orders_payment_status_check missing 'authorized', persisting card with pending payment_status");
      const fallback = await supabase
        .from("orders")
        .update({
          stripe_customer_id: details.stripeCustomerId,
          stripe_payment_method_id: details.stripePaymentMethodId,
          card_brand: details.cardBrand || "card",
          card_last4: details.cardLast4 || "",
          order_status: "confirmed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .select("*, proofs:order_proofs(*)")
        .maybeSingle();
      data = fallback.data;
      error = fallback.error;
    }

    if (error || !data) {
      console.error("[billing-service] Failed to record card authorization:", error);
      return null;
    }

    const order = await OrderService.getOrderByNumber(orderId);
    if (order) {
      void broadcastOrderEvent({
        eventType: "order_status_updated",
        orderId: order.id,
        orderNumber: order.order_number,
        orderStatus: "confirmed",
        userId: order.user_id,
        customerEmail: order.customer_email,
        customerName: order.customer_name,
        totalAmount: order.total_amount,
        updatedAt: new Date().toISOString(),
      });
    }
    return order;
  }

  /**
   * Charges customer's saved card off-session for the exact measured scale weight.
   */
  static async chargePerPoundFinalWeight(
    orderId: string,
    weightLbs: number,
    options?: { customPoundRate?: number; proofImageUrl?: string }
  ): Promise<{
    success: boolean;
    order?: Order;
    totalAmount?: number;
    error?: string;
    cardDeclined?: boolean;
  }> {
    if (!Number.isFinite(weightLbs) || weightLbs <= 0) {
      return { success: false, error: "Scale weight must be a positive number." };
    }

    const order = await OrderService.getOrderByNumber(orderId);
    if (!order) return { success: false, error: "Order not found." };
    if (order.payment_status === "paid" && order.order_status === "completed") {
      return { success: false, error: "This order is already completed and finalized." };
    }

    const pricing = await PricingPlanService.getPricing();
    if (!pricing) return { success: false, error: "Pricing rules not configured." };

    // Calculate exact pricing based on verified scale weight or admin customized rate
    const defaultRate = pricing.pound_price > 0 ? pricing.pound_price : 1.5;
    const poundRate = (options?.customPoundRate && options.customPoundRate > 0) ? options.customPoundRate : defaultRate;
    const subtotal = Math.round(weightLbs * poundRate * 100) / 100;
    const deliveryFee = weightLbs >= pricing.free_delivery_lbs ? 0 : pricing.standard_delivery_fee;
    const detergentFee = Number(order.detergent_fee || 0);
    const totalAmount = Math.max(0, subtotal + detergentFee + deliveryFee - Number(order.discount_amount || 0));
    const amountCents = Math.round(totalAmount * 100);

    const hasCardOnFile = Boolean(order.stripe_customer_id && order.stripe_payment_method_id && stripe);
    let paymentIntentId: string | null = null;

    if (hasCardOnFile && stripe) {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountCents,
          currency: "usd",
          customer: order.stripe_customer_id!,
          payment_method: order.stripe_payment_method_id!,
          off_session: true,
          confirm: true,
          description: `Laundry Express Order #${order.order_number} (${weightLbs} lbs @ $${poundRate}/lb)`,
          metadata: {
            order_id: order.id,
            order_number: order.order_number,
            measured_weight_lbs: String(weightLbs),
          },
        });
        paymentIntentId = paymentIntent.id;
      } catch (chargeError: unknown) {
        const msg = chargeError instanceof Error ? chargeError.message : "Card charge failed.";
        console.error("[billing-service] Stripe off-session charge failed:", chargeError);

        const supabase = createAdminSupabaseClient();
        await supabase
          .from("orders")
          .update({
            payment_status: "failed",
            final_weight_lbs: weightLbs,
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.id);

        return { success: false, error: msg, cardDeclined: true };
      }
    }

    // Update order with confirmed weight, final total, and advance status
    const supabase = createAdminSupabaseClient();
    if (options?.proofImageUrl) {
      await supabase.from("order_proofs").insert({
        order_id: order.id,
        proof_type: "pickup",
        image_url: options.proofImageUrl,
      });
    }

    const nextStatus = (order.order_status === "confirmed" || order.order_status === "driver_assigned") ? "in_wash" : order.order_status;
    const { data: updatedRecord, error: updateError } = await supabase
      .from("orders")
      .update({
        final_weight_lbs: weightLbs,
        subtotal,
        delivery_fee: deliveryFee,
        total_amount: totalAmount,
        payment_status: paymentIntentId ? "paid" : (order.payment_status === "paid" ? "paid" : "authorized"),
        stripe_payment_intent_id: paymentIntentId || order.stripe_payment_intent,
        order_status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .select("*, proofs:order_proofs(*)")
      .maybeSingle();

    if (updateError || !updatedRecord) {
      return { success: false, error: "Payment succeeded but failed to update order record." };
    }

    const updatedOrder = await OrderService.getOrderByNumber(order.id);
    if (!updatedOrder) return { success: true, totalAmount };

    // Broadcast live event for real-time dashboard updates
    void broadcastOrderEvent({
      eventType: "order_paid",
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.order_number,
      orderStatus: updatedOrder.order_status,
      totalAmount,
      userId: updatedOrder.user_id,
      customerEmail: updatedOrder.customer_email,
      customerName: updatedOrder.customer_name,
      updatedAt: new Date().toISOString(),
    });

    // Generate & email itemized invoice with scale weight
    try {
      const settings = await ContentService.getSettings();
      const invoicePayload = orderToUnifiedInvoice(updatedOrder, {
        slotTimes: settings
          ? { s1: settings.slot1_start, e1: settings.slot1_end, s2: settings.slot2_start, e2: settings.slot2_end }
          : undefined,
        customerName: updatedOrder.customer_name,
        customerEmail: updatedOrder.customer_email,
        transactionId: paymentIntentId || updatedOrder.stripe_payment_intent || undefined,
      });

      if (invoicePayload.customerEmail) {
        await sendInvoiceEmail(invoicePayload as unknown as InvoiceEmailPayload);
        await OrderService.markInvoiceEmailSent(updatedOrder.id);
      }
    } catch (emailErr) {
      console.error("[billing-service] Failed to email invoice after scale charge:", emailErr);
    }

    return { success: true, order: updatedOrder, totalAmount };
  }
}

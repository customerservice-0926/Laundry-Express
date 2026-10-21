import { AddressService } from "@/lib/services/address-service";
import { UserDbService } from "@/lib/services/user-db-service";
import { OrderService } from "@/lib/services/order-service";
import { OrderBillingService } from "@/lib/services/order-billing-service";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/stripe-server";
import type Stripe from "stripe";
import type { User, Order } from "@/types";

export interface CheckoutContactPayload {
  customer_phone?: string;
  street_address?: string;
  apt_unit?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}

/**
 * Persists address and phone number from order checkout into user profile and address book.
 */
export async function syncUserOrderContact(
  user: User,
  payload: CheckoutContactPayload
): Promise<void> {
  if (!user?.id) return;

  const phone = (payload.customer_phone || "").trim();
  const street = (payload.street_address || "").trim();
  const apt = (payload.apt_unit || "").trim();
  const city = (payload.city || "").trim();
  const state = (payload.state || "").trim().toUpperCase();
  const zip = (payload.zip_code || "").trim();

  // 1. Save or update address in user_addresses table
  if (street && city && zip) {
    try {
      await AddressService.saveAddress({
        user_id: user.id,
        label: "Home",
        street_address: street,
        apt_unit: apt || undefined,
        city,
        state,
        zip_code: zip,
        is_default: true,
      });
    } catch (error) {
      console.error("[checkout-sync] Failed to save address:", error);
    }
  }

  // 2. Update user profile in public.users (phone and address)
  const profileUpdates: Partial<Pick<User, "phone" | "address">> = {};
  if (phone) profileUpdates.phone = phone;
  if (street && city && zip) {
    profileUpdates.address = [street, apt ? `Apt ${apt}` : "", city, `${state} ${zip}`].filter(Boolean).join(", ");
  }

  if (Object.keys(profileUpdates).length > 0) {
    try {
      await UserDbService.updateProfile(user.id, profileUpdates, user.email);
    } catch (error) {
      console.error("[checkout-sync] Failed to update user profile:", error);
    }
  }
}

/**
 * Synchronizes order payment status with Stripe checkout session after customer completes checkout.
 */
export async function syncStripeCheckoutSession(order: Order, sessionId: string): Promise<Order> {
  if (!sessionId || !stripe) return order;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["setup_intent", "payment_intent"] });
    if (!session) return order;

    if (session.mode === "setup" || session.metadata?.checkout_type === "initial_tip_delivery" || session.metadata?.checkout_type === "card_setup") {
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id || "";
      let paymentMethodId = "";
      let paymentIntentId = "";

      if (session.mode === "setup") {
        const setupIntent = session.setup_intent as Stripe.SetupIntent | null;
        paymentMethodId = typeof setupIntent?.payment_method === "string" ? setupIntent.payment_method : setupIntent?.payment_method?.id || "";
      } else {
        const piObj = session.payment_intent as Stripe.PaymentIntent | null;
        paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || "";
        if (piObj) {
          paymentMethodId = typeof piObj.payment_method === "string" ? piObj.payment_method : piObj.payment_method?.id || "";
        } else if (paymentIntentId) {
          try {
            const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
            paymentMethodId = typeof pi.payment_method === "string" ? pi.payment_method : pi.payment_method?.id || "";
          } catch {}
        }
      }

      if (customerId && paymentMethodId) {
        if (order.stripe_payment_method_id === paymentMethodId && (order.payment_status === "authorized" || order.payment_status === "paid")) {
          return order;
        }
        let cardBrand = "card", cardLast4 = "";
        try {
          const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
          cardBrand = pm.card?.brand || "card";
          cardLast4 = pm.card?.last4 || "";
        } catch {}
        const updated = await OrderBillingService.recordCardAuthorized(order.id, {
          stripeCustomerId: customerId,
          stripePaymentMethodId: paymentMethodId,
          cardBrand,
          cardLast4,
        });
        if (updated) {
          if (paymentIntentId) {
            await createAdminSupabaseClient().from("orders").update({ stripe_payment_intent_id: paymentIntentId }).eq("id", order.id);
          }
          return updated;
        }
      }
    } else if (session.mode === "payment" && session.payment_status === "paid") {
      if (order.payment_status === "paid" && (order.stripe_payment_method_id || order.stripe_payment_intent)) {
        return order;
      }
      const supabase = createAdminSupabaseClient();
      const piObj = session.payment_intent as Stripe.PaymentIntent | null;
      const paymentIntentId = typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id || "";
      let customerId = typeof session.customer === "string" ? session.customer : session.customer?.id || "";
      let paymentMethodId = "";
      let cardBrand = "card";
      let cardLast4 = "";

      if (piObj) {
        if (!customerId && piObj.customer) customerId = typeof piObj.customer === "string" ? piObj.customer : piObj.customer.id;
        paymentMethodId = typeof piObj.payment_method === "string" ? piObj.payment_method : piObj.payment_method?.id || "";
      } else if (paymentIntentId) {
        try {
          const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
          if (!customerId && pi.customer) customerId = typeof pi.customer === "string" ? pi.customer : pi.customer.id;
          paymentMethodId = typeof pi.payment_method === "string" ? pi.payment_method : pi.payment_method?.id || "";
        } catch {}
      }

      if (paymentMethodId) {
        try {
          const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
          cardBrand = pm.card?.brand || "card";
          cardLast4 = pm.card?.last4 || "";
        } catch {}
      }

      const updateData: Record<string, unknown> = {
        payment_status: "paid",
        order_status: order.order_status === "pending" ? "confirmed" : order.order_status,
        stripe_payment_intent_id: paymentIntentId || undefined,
        stripe_customer_id: customerId || undefined,
        stripe_payment_method_id: paymentMethodId || undefined,
        card_brand: cardBrand || undefined,
        card_last4: cardLast4 || undefined,
        updated_at: new Date().toISOString(),
      };

      await supabase.from("orders").update(updateData).eq("id", order.id);
      const refreshed = await OrderService.getOrderByNumber(order.id);
      if (refreshed) return refreshed;
    }
  } catch (err) {
    console.error("[syncStripeCheckoutSession] error:", err);
  }
  return order;
}


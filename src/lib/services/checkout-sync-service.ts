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
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["setup_intent"] });
    if (!session) return order;

    if (session.mode === "setup") {
      const setupIntent = session.setup_intent as Stripe.SetupIntent | null;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id || "";
      const paymentMethodId = typeof setupIntent?.payment_method === "string" ? setupIntent.payment_method : setupIntent?.payment_method?.id || "";
      if (customerId && paymentMethodId) {
        const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
        const cardBrand = pm.card?.brand || "card";
        const cardLast4 = pm.card?.last4 || "";
        const updated = await OrderBillingService.recordCardAuthorized(order.id, {
          stripeCustomerId: customerId,
          stripePaymentMethodId: paymentMethodId,
          cardBrand,
          cardLast4,
        });
        if (updated) return updated;
      }
    } else if (session.mode === "payment" && session.payment_status === "paid") {
      const supabase = createAdminSupabaseClient();
      const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || "";
      await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          order_status: order.order_status === "pending" ? "confirmed" : order.order_status,
          stripe_payment_intent_id: paymentIntentId || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      const refreshed = await OrderService.getOrderByNumber(order.id);
      if (refreshed) return refreshed;
    }
  } catch (err) {
    console.error("[syncStripeCheckoutSession] error:", err);
  }
  return order;
}


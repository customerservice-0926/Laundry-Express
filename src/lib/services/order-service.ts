import { randomBytes, randomUUID } from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ContentService } from "@/lib/services/content-service";
import { PricingPlanService } from "@/lib/services/pricing-plan-service";
import { mapOrderRecord } from "@/lib/services/order-record-mapper";
import { broadcastOrderEvent } from "@/lib/services/order-realtime-service";
import type { Order, OrderStatus } from "@/types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["driver_assigned", "cancelled"], confirmed: ["driver_assigned", "cancelled"],
  driver_assigned: ["picked_up", "in_wash", "cancelled"], picked_up: ["in_wash", "cancelled"],
  in_wash: ["out_for_delivery", "cancelled"], out_for_delivery: ["completed", "cancelled"],
  completed: [], cancelled: [],
};

export class OrderService {
  static async getOrders(userId?: string, userEmail?: string): Promise<Order[]> {
    const supabase = createAdminSupabaseClient();
    let query = supabase.from("orders").select("*, proofs:order_proofs(*)").order("created_at", { ascending: false });
    if (userId && userEmail) {
      const [byId, byEmail] = await Promise.all([
        supabase.from("orders").select("*, proofs:order_proofs(*)").eq("user_id", userId),
        supabase.from("orders").select("*, proofs:order_proofs(*)").is("user_id", null).eq("customer_email", userEmail),
      ]);
      if (byId.error || byEmail.error) throw new Error(`Unable to load orders: ${byId.error?.message || byEmail.error?.message}`);
      const records = [...(byId.data || []), ...(byEmail.data || [])];
      return Array.from(new Map(records.map((r) => [r.id, r])).values())
        .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
        .map(mapOrderRecord);
    }
    if (userId) query = query.eq("user_id", userId);
    else if (userEmail) query = query.eq("customer_email", userEmail);
    const { data, error } = await query;
    if (error) throw new Error(`Unable to load orders: ${error.message}`);
    return (data || []).map(mapOrderRecord);
  }

  static async getOrderByNumber(identifier: string): Promise<Order | null> {
    const supabase = createAdminSupabaseClient();
    const query = supabase.from("orders").select("*, proofs:order_proofs(*)");
    const { data, error } = UUID_PATTERN.test(identifier)
      ? await query.eq("id", identifier).maybeSingle()
      : await query.eq("order_number", identifier).maybeSingle();
    if (error) throw new Error(`Unable to load order: ${error.message}`);
    return data ? mapOrderRecord(data) : null;
  }

  static async createOrder(payload: Partial<Order>): Promise<Order> {
    if (!payload.detergent_id) throw new Error("A detergent selection is required.");
    const settings = await ContentService.getSettings();
    const slotCapacity = settings?.max_orders_per_slot;
    if (typeof slotCapacity !== "number" || !Number.isInteger(slotCapacity) || slotCapacity < 1) {
      throw new Error("Pickup capacity is not configured.");
    }
    const address = {
      street_address: payload.street_address || "", apt_unit: payload.apt_unit || "",
      city: payload.city || "", state: payload.state || "", zip_code: payload.zip_code || "",
    };
    const orderNumber = `LX-${new Date().getFullYear()}-${randomBytes(8).toString("hex").toUpperCase()}`;
    const supabase = createAdminSupabaseClient();
    const orderData = {
      id: randomUUID(), order_number: orderNumber,
      user_id: payload.user_id && payload.user_id !== "guest-customer" ? payload.user_id : null,
      customer_name: payload.customer_name?.trim() || "Customer",
      customer_email: payload.customer_email?.trim().toLowerCase() || "",
      customer_phone: payload.customer_phone?.trim() || "",
      plan_type: payload.pricing_mode || "per_bag", bag_count: payload.bag_count ?? 1,
      package_id: payload.package_id || null, package_name: payload.package_name || null,
      estimated_weight_lbs: payload.estimated_weight_lbs ?? 0, weight_lbs: payload.estimated_weight_lbs ?? 0,
      detergent_id: payload.detergent_id, detergent_name: payload.detergent_name || "",
      detergent_fee: payload.detergent_fee ?? 0, pickup_date: payload.pickup_date,
      pickup_time_slot: payload.pickup_slot, dropoff_date: payload.delivery_date || null,
      pickup_address: address, ...address, is_home_for_pickup: !payload.is_out_of_home,
      doorstep_confirmation: Boolean(payload.bag_outside_door_confirmed),
      special_instructions: payload.special_instructions || payload.customer_notes || "",
      subtotal: payload.subtotal ?? 0, discount_amount: payload.discount_amount ?? 0,
      coupon_code: payload.coupon_code || null, coupon_usage_counted_at: null,
      delivery_fee: payload.delivery_fee ?? 0, tax_amount: payload.tax_amount ?? 0,
      total_amount: payload.total_amount ?? 0, order_status: "pending", payment_status: "pending",
      payment_method: payload.payment_method || "card",
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.rpc("create_order_with_slot_capacity", {
      p_order: orderData,
      p_pickup_date: payload.pickup_date,
      p_pickup_slot: payload.pickup_slot,
      p_slot_capacity: slotCapacity,
    });
    const record = Array.isArray(data) ? data[0] : data;
    if (error || !record) {
      if (error?.message.includes("PICKUP_SLOT_FULL")) {
        throw new Error("The selected pickup window is fully booked. Please choose another slot.");
      }
      throw new Error(`Unable to save order: ${error?.message || "No order returned."}`);
    }
    const order = mapOrderRecord(record);
    if (!order.package_name && payload.package_name) order.package_name = payload.package_name;
    void broadcastOrderEvent({
      eventType: "order_created", orderId: order.id, orderNumber: order.order_number,
      orderStatus: order.order_status, paymentStatus: order.payment_status,
      userId: order.user_id, customerEmail: order.customer_email, customerName: order.customer_name,
      totalAmount: order.total_amount, pickupDate: order.pickup_date, pickupSlot: order.pickup_slot,
      updatedAt: order.created_at || new Date().toISOString(),
    });
    return order;
  }

  static async saveCheckoutSessionId(orderId: string, sessionId: string): Promise<void> {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase.from("orders")
      .update({ stripe_checkout_session_id: sessionId, updated_at: new Date().toISOString() })
      .eq("id", orderId).eq("payment_status", "pending").select("id").maybeSingle();
    if (error || !data) throw new Error(`Unable to store Stripe session: ${error?.message || "Order is not pending."}`);
  }

  static async getCheckoutSessionId(orderId: string): Promise<string | null> {
    const { data, error } = await createAdminSupabaseClient().from("orders")
      .select("stripe_checkout_session_id").eq("id", orderId).maybeSingle();
    if (error) throw new Error(`Unable to load Stripe checkout session: ${error.message}`);
    return data?.stripe_checkout_session_id || null;
  }

  static async markOrderPaid(
    identifier: string,
    details?: { stripe_payment_intent_id?: string; customer_name?: string; customer_email?: string; payment_method?: string }
  ): Promise<Order | null> {
    const order = await this.getOrderByNumber(identifier);
    if (!order) return null;
    if (order.payment_status === "paid") return order;
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase.from("orders").update({
      payment_status: "paid", order_status: order.order_status === "cancelled" ? "cancelled" : "confirmed",
      stripe_payment_intent_id: details?.stripe_payment_intent_id,
      customer_name: details?.customer_name || order.customer_name,
      customer_email: details?.customer_email || order.customer_email,
      payment_method: details?.payment_method || "card", updated_at: new Date().toISOString(),
    }).eq("id", order.id).in("payment_status", ["pending", "failed"]).eq("order_status", order.order_status).select("id").maybeSingle();
    if (error) throw new Error(`Unable to confirm paid order: ${error.message}`);
    if (!data) {
      const current = await this.getOrderByNumber(order.id);
      if (current?.payment_status === "paid") return current;
      if (current && current.order_status === "cancelled" && ["pending", "failed"].includes(current.payment_status || "")) {
        const { data: cancelledOrder, error: cancelledError } = await supabase.from("orders").update({
          payment_status: "paid", stripe_payment_intent_id: details?.stripe_payment_intent_id,
          customer_name: details?.customer_name || current.customer_name,
          customer_email: details?.customer_email || current.customer_email,
          payment_method: details?.payment_method || "card", updated_at: new Date().toISOString(),
        }).eq("id", current.id).eq("order_status", "cancelled").in("payment_status", ["pending", "failed"]).select("id").maybeSingle();
        if (cancelledError) throw new Error(`Unable to record payment: ${cancelledError.message}`);
        if (cancelledOrder) return this.getOrderByNumber(current.id);
      }
      throw new Error("Order payment status changed before confirmation.");
    }
    const finalOrder = await this.getOrderByNumber(order.id);
    if (finalOrder) {
      void broadcastOrderEvent({
        eventType: "order_paid", orderId: finalOrder.id, orderNumber: finalOrder.order_number,
        orderStatus: finalOrder.order_status, paymentStatus: "paid", userId: finalOrder.user_id,
        customerEmail: finalOrder.customer_email, customerName: finalOrder.customer_name,
        totalAmount: finalOrder.total_amount, updatedAt: finalOrder.updated_at || new Date().toISOString(),
      });
    }
    return finalOrder;
  }

  static async markOrderPaymentFailed(identifier: string): Promise<void> {
    const order = await this.getOrderByNumber(identifier);
    if (!order || order.payment_status === "paid") return;
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase.from("orders").update({
      payment_status: "failed", order_status: "cancelled", updated_at: new Date().toISOString(),
    }).eq("id", order.id).eq("payment_status", "pending");
    if (error) throw new Error(`Unable to record failed payment: ${error.message}`);
  }

  static async markInvoiceEmailSent(orderId: string): Promise<void> {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase.from("orders")
      .update({ invoice_email_sent_at: new Date().toISOString() })
      .eq("id", orderId).is("invoice_email_sent_at", null).select("id").maybeSingle();
    if (error) throw new Error(`Unable to record invoice delivery: ${error.message}`);
    if (!data) {
      const order = await this.getOrderByNumber(orderId);
      if (!order?.invoice_email_sent_at) throw new Error("Unable to record invoice delivery.");
    }
  }

  static async updateOrderStatus(orderId: string, status: OrderStatus): Promise<boolean> {
    const order = await this.getOrderByNumber(orderId);
    if (!order) throw new Error("Order not found.");
    if (order.order_status === status) return true;
    if (!ORDER_TRANSITIONS[order.order_status].includes(status)) {
      throw new Error(`Order cannot move from ${order.order_status} to ${status}.`);
    }
    if (order.order_status === "pending" && status === "driver_assigned") {
      throw new Error("Orders must be confirmed by payment before dispatch.");
    }
    const supabase = createAdminSupabaseClient();
    const column = UUID_PATTERN.test(orderId) ? "id" : "order_number";
    const { data, error } = await supabase.from("orders")
      .update({ order_status: status, updated_at: new Date().toISOString() })
      .eq(column, orderId).eq("order_status", order.order_status).select("id").maybeSingle();
    if (error || !data) throw new Error(`Unable to update order status: ${error?.message || "Status changed before update."}`);
    void broadcastOrderEvent({
      eventType: status === "cancelled" ? "order_cancelled" : "order_status_updated",
      orderId: order.id, orderNumber: order.order_number, orderStatus: status,
      userId: order.user_id, customerEmail: order.customer_email, customerName: order.customer_name,
      totalAmount: order.total_amount, updatedAt: new Date().toISOString(),
    });
    return true;
  }

  static async updateFinalWeight(orderId: string, weightLbs: number): Promise<boolean> {
    if (!Number.isFinite(weightLbs) || weightLbs <= 0) throw new Error("Final weight must be positive.");
    const [order, pricing] = await Promise.all([this.getOrderByNumber(orderId), PricingPlanService.getPricing()]);
    if (!order) throw new Error("Order not found.");
    if (!pricing) throw new Error("Pricing is not configured.");
    const perPoundRate = order.pricing_mode === "per_lb" && order.estimated_weight_lbs ? order.subtotal / order.estimated_weight_lbs : pricing.pound_price;
    const subtotal = Math.round(weightLbs * perPoundRate * 100) / 100;
    const deliveryFee = weightLbs >= pricing.free_delivery_lbs ? 0 : pricing.standard_delivery_fee;
    const total = Math.max(0, subtotal + Number((order as Order & { detergent_fee?: number }).detergent_fee || 0) + deliveryFee - order.discount_amount);
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase.from("orders").update({ final_weight_lbs: weightLbs, subtotal, delivery_fee: deliveryFee, total_amount: total, updated_at: new Date().toISOString() }).eq("id", order.id).select("id").maybeSingle();
    if (error || !data) throw new Error(`Unable to update final weight: ${error?.message || "Order not found."}`);
    void broadcastOrderEvent({ eventType: "order_status_updated", orderId: order.id, orderNumber: order.order_number, orderStatus: order.order_status, totalAmount: total, userId: order.user_id, customerEmail: order.customer_email, customerName: order.customer_name, updatedAt: new Date().toISOString() });
    return true;
  }

  static async uploadProof(orderId: string, proofType: "pickup" | "dropoff" | "damage", imageUrl: string, notes?: string): Promise<boolean> {
    const order = await this.getOrderByNumber(orderId);
    if (!order) throw new Error("Order not found.");
    const proofTypeMap = { pickup: "pickup_doorstep", dropoff: "delivery_doorstep", damage: "processing_wash" } as const;
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase.from("order_proofs").insert({ order_id: order.id, proof_type: proofTypeMap[proofType], photo_url: imageUrl, notes: notes || null });
    if (error) throw new Error(`Unable to save order proof: ${error.message}`);
    void broadcastOrderEvent({ eventType: "order_proof_uploaded", orderId: order.id, orderNumber: order.order_number, orderStatus: order.order_status, proofType, userId: order.user_id, customerEmail: order.customer_email, customerName: order.customer_name, updatedAt: new Date().toISOString() });
    return true;
  }
}

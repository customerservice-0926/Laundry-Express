import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { broadcastOrderEvent } from "@/lib/services/order-realtime-service";
import { mapOrderRecord } from "@/lib/services/order-record-mapper";
import { PricingPlanService } from "@/lib/services/pricing-plan-service";
import { CardOnFileService } from "@/lib/services/card-on-file-service";
import { STORAGE_BUCKETS } from "@/lib/services/image-storage-service";
import type { Order, PricingMode } from "@/types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function extractProofStoragePath(photoUrl?: string | null): string | null {
  if (!photoUrl) return null;
  try {
    if (photoUrl.includes("path=")) return decodeURIComponent(new URL(photoUrl, "http://localhost").searchParams.get("path") || "");
    if (photoUrl.includes(`/${STORAGE_BUCKETS.ORDER_PROOFS}/`)) return decodeURIComponent(photoUrl.split(`/${STORAGE_BUCKETS.ORDER_PROOFS}/`)[1]?.split("?")[0] || "");
  } catch {}
  return null;
}

export interface OrderUpdatePayload {
  pricing_mode?: PricingMode;
  bag_count?: number; weight_lbs?: number; pound_rate?: number; bag_rate?: number;
  detergent_id?: string; detergent_name?: string; detergent_fee?: number;
  additional_items?: Order["additional_items"]; additional_items_fee?: number;
  tip_amount?: number; delivery_fee?: number; distance_surcharge?: number;
  pickup_date?: string; pickup_slot?: "8am-12pm" | "1pm-6pm"; delivery_date?: string | null;
  customer_name?: string; customer_phone?: string; customer_email?: string;
  street_address?: string; apt_unit?: string; city?: string; state?: string; zip_code?: string;
  order_status?: Order["order_status"]; payment_status?: string; customer_notes?: string;
  charge_card?: boolean;
}

export interface UpdateOrderResult {
  order: Order;
  cardCharged: boolean;
  chargedAmount: number;
  chargeMessage: string;
}

export class OrderManagementService {
  /**
   * Updates an existing order, with support for converting between Bags and Pounds,
   * adjusting weights/rates/additional items/tips, and recalculating totals.
   */
  static async updateOrder(orderId: string, updates: OrderUpdatePayload): Promise<UpdateOrderResult> {
    const supabase = createAdminSupabaseClient();
    const isIdUuid = UUID_PATTERN.test(orderId);
    const lookupQuery = supabase.from("orders").select("*, proofs:order_proofs(*)");
    const { data: current, error: findErr } = isIdUuid
      ? await lookupQuery.eq("id", orderId).maybeSingle()
      : await lookupQuery.eq("order_number", orderId).maybeSingle();

    if (findErr || !current) throw new Error("Order not found.");

    const currentOrder = mapOrderRecord(current);
    const pricing = await PricingPlanService.getPricing();
    const isPaid = currentOrder.payment_status === "paid";
    const hasBillingChanges = updates.pricing_mode !== undefined || updates.bag_count !== undefined || updates.weight_lbs !== undefined || updates.additional_items !== undefined || updates.tip_amount !== undefined;
    if (isPaid && hasBillingChanges) {
      throw new Error("Order charges have already been cut and paid via Stripe. Billing metrics cannot be altered again.");
    }

    // 1. Determine target mode & volumes
    const mode = updates.pricing_mode ?? currentOrder.pricing_mode;
    const bagCount = mode === "per_bag"
      ? Math.max(1, updates.bag_count ?? currentOrder.bag_count ?? 1)
      : 0;

    const finalWeight = mode === "per_lb"
      ? (updates.weight_lbs ?? currentOrder.final_weight_lbs ?? currentOrder.estimated_weight_lbs ?? 15)
      : null;

    // 2. Determine rates & calculate subtotal
    let subtotal = 0;
    if (mode === "per_bag") {
      const bagRate = updates.bag_rate && updates.bag_rate > 0 ? updates.bag_rate : (pricing?.bag_price || 25);
      subtotal = Math.round(bagCount * bagRate * 100) / 100;
    } else {
      const poundRate = updates.pound_rate && updates.pound_rate > 0 ? updates.pound_rate : (pricing?.pound_price || 1.75);
      subtotal = Math.round((finalWeight || 15) * poundRate * 100) / 100;
    }

    // 3. Detergent, Additional Items, Tips & Distance Surcharges
    const detergentFee = updates.detergent_fee !== undefined
      ? Number(updates.detergent_fee)
      : Number(currentOrder.detergent_fee || 0);

    const additionalItems = updates.additional_items ?? currentOrder.additional_items ?? [];
    const additionalItemsFee = updates.additional_items_fee !== undefined
      ? Number(updates.additional_items_fee)
      : Math.round(additionalItems.reduce((acc, it) => acc + (it.price * it.quantity), 0) * 100) / 100;

    const tipAmount = updates.tip_amount !== undefined
      ? Number(updates.tip_amount)
      : Number(currentOrder.tip_amount || 0);

    const deliveryFee = updates.delivery_fee !== undefined
      ? Number(updates.delivery_fee)
      : Number(currentOrder.delivery_fee || 0);
    const distanceSurcharge = 0;
    const discountAmount = Number(currentOrder.discount_amount || 0);

    const totalAmount = Math.max(
      0,
      Math.round((subtotal + detergentFee + additionalItemsFee + deliveryFee + tipAmount - discountAmount) * 100) / 100
    );

    const address = {
      street_address: updates.street_address ?? currentOrder.street_address ?? "",
      apt_unit: updates.apt_unit ?? currentOrder.apt_unit ?? "",
      city: updates.city ?? currentOrder.city ?? "",
      state: updates.state ?? currentOrder.state ?? "IL",
      zip_code: updates.zip_code ?? currentOrder.zip_code ?? "",
    };

    const currentPickupAddr = (current.pickup_address && typeof current.pickup_address === "object")
      ? (current.pickup_address as Record<string, unknown>)
      : {};

    const addressWithMeta = {
      ...currentPickupAddr,
      ...address,
      additional_items: additionalItems,
      additional_items_fee: additionalItemsFee,
      tip_amount: tipAmount,
      distance_surcharge: distanceSurcharge,
    };

    const updateRecord: Record<string, unknown> = {
      plan_type: mode,
      bag_count: bagCount,
      estimated_weight_lbs: mode === "per_lb" ? finalWeight : 0,
      final_weight_lbs: finalWeight,
      weight_lbs: mode === "per_lb" ? finalWeight : 0,
      subtotal,
      detergent_id: updates.detergent_id ?? currentOrder.detergent_id,
      detergent_name: updates.detergent_name ?? currentOrder.detergent_name,
      detergent_fee: detergentFee,
      additional_items: additionalItems,
      additional_items_fee: additionalItemsFee,
      tip_amount: tipAmount,
      distance_surcharge: distanceSurcharge,
      delivery_fee: deliveryFee,
      total_amount: totalAmount,
      pickup_date: updates.pickup_date ?? currentOrder.pickup_date,
      pickup_time_slot: updates.pickup_slot ?? currentOrder.pickup_slot,
      dropoff_date: updates.delivery_date !== undefined ? updates.delivery_date : currentOrder.delivery_date,
      customer_name: updates.customer_name ?? currentOrder.customer_name,
      customer_phone: updates.customer_phone ?? currentOrder.customer_phone,
      customer_email: updates.customer_email ?? currentOrder.customer_email,
      ...address, pickup_address: addressWithMeta,
      order_status: (updates.order_status === "completed" && (updates.payment_status ?? currentOrder.payment_status) === "pending") ? (() => { throw new Error("Cannot complete order while payment is pending."); })() : ((updates.payment_status ?? currentOrder.payment_status) === "paid" && (updates.order_status ?? currentOrder.order_status) === "pending" ? "confirmed" : (updates.order_status ?? currentOrder.order_status)),
      payment_status: updates.payment_status ?? currentOrder.payment_status,
      special_instructions: updates.customer_notes ?? currentOrder.customer_notes,
      updated_at: new Date().toISOString(),
    };

    let { data: updated, error: updateErr } = await supabase
      .from("orders")
      .update(updateRecord)
      .eq("id", currentOrder.id)
      .select("*, proofs:order_proofs(*)")
      .single();

    if (updateErr && (updateErr.message.includes("schema cache") || updateErr.message.includes("column"))) {
      const fallback = { ...updateRecord };
      ["additional_items", "additional_items_fee", "tip_amount", "distance_surcharge", "distance_miles", "card_setup_link"].forEach((k) => delete fallback[k]);
      const retryRes = await supabase.from("orders").update(fallback).eq("id", currentOrder.id).select("*, proofs:order_proofs(*)").single();
      updated = retryRes.data;
      updateErr = retryRes.error;
    }

    if (updateErr || !updated) {
      throw new Error(`Unable to update order: ${updateErr?.message || "Failed to update record."}`);
    }

    const savedOrder = mapOrderRecord(updated);

    // If customer has a card on file, cut the cost off-session upon changing the value
    const hasCard = Boolean((savedOrder.stripe_customer_id || currentOrder.stripe_customer_id) && (savedOrder.stripe_payment_method_id || currentOrder.stripe_payment_method_id));
    const toCharge = !isPaid ? savedOrder.total_amount : savedOrder.total_amount > currentOrder.total_amount ? Math.round((savedOrder.total_amount - currentOrder.total_amount) * 100) / 100 : 0;

    let cardCharged = false, chargedAmount = 0, chargeMessage = "Order updated successfully.";
    if (toCharge > 0 && updates.charge_card !== false) {
      if (hasCard) {
        const chargeRes = await CardOnFileService.chargeCardOnFile(savedOrder.id, toCharge, savedOrder.total_amount);
        if (!chargeRes.success) throw new Error(`Order saved, but Stripe card charge failed: ${chargeRes.error}`);
        return { order: chargeRes.order || savedOrder, cardCharged: true, chargedAmount: toCharge, chargeMessage: `Order updated and customer's card was charged $${toCharge.toFixed(2)} successfully via Stripe.` };
      }
      chargeMessage = `Order updated. Note: No card on file found for customer. Total increased by $${toCharge.toFixed(2)}. Send payment link to collect payment.`;
    }

    void broadcastOrderEvent({
      eventType: "order_status_updated", orderId: savedOrder.id, orderNumber: savedOrder.order_number,
      orderStatus: savedOrder.order_status, totalAmount: savedOrder.total_amount,
      customerEmail: savedOrder.customer_email, customerName: savedOrder.customer_name, updatedAt: savedOrder.updated_at,
    });
    return { order: savedOrder, cardCharged, chargedAmount, chargeMessage };
  }

  /**
   * Deletes an order and its associated images from storage and DB permanently.
   */
  static async deleteOrder(orderId: string): Promise<boolean> {
    const supabase = createAdminSupabaseClient();
    const isIdUuid = UUID_PATTERN.test(orderId);
    const col = isIdUuid ? "id" : "order_number";

    const { data: ord } = await supabase.from("orders").select("id, order_number, customer_email").eq(col, orderId).maybeSingle();
    if (!ord) throw new Error("Order not found.");

    try {
      const { data: proofs } = await supabase.from("order_proofs").select("photo_url").eq("order_id", ord.id);
      const paths = (proofs || []).map((p) => extractProofStoragePath(p.photo_url)).filter(Boolean) as string[];
      const { data: files } = await supabase.storage.from(STORAGE_BUCKETS.ORDER_PROOFS).list(`order-${ord.id}`);
      if (files?.length) files.forEach((f) => paths.push(`order-${ord.id}/${f.name}`));
      if (paths.length > 0) await supabase.storage.from(STORAGE_BUCKETS.ORDER_PROOFS).remove(Array.from(new Set(paths)));
    } catch (storageErr) {
      console.warn("[deleteOrder] Error removing proof files from storage:", storageErr);
    }

    await supabase.from("order_proofs").delete().eq("order_id", ord.id);
    const { error } = await supabase.from("orders").delete().eq("id", ord.id);
    if (error) throw new Error(`Unable to delete order: ${error.message}`);

    void broadcastOrderEvent({
      eventType: "order_cancelled",
      orderId: ord.id,
      orderNumber: ord.order_number,
      orderStatus: "cancelled",
      customerEmail: ord.customer_email, updatedAt: new Date().toISOString(),
    });
    return true;
  }

  static async deleteProof(orderId: string, proofId: string): Promise<boolean> {
    const supabase = createAdminSupabaseClient();
    const { data: proof } = await supabase.from("order_proofs").select("id, photo_url").eq("id", proofId).maybeSingle();
    if (!proof) return false;
    const path = extractProofStoragePath(proof.photo_url);
    if (path) await supabase.storage.from(STORAGE_BUCKETS.ORDER_PROOFS).remove([path]).catch(() => {});
    const { error } = await supabase.from("order_proofs").delete().eq("id", proofId);
    if (error) throw new Error(`Failed to delete proof: ${error.message}`);
    return true;
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { getVerifiedUser } from "@/lib/auth-request";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { sanitizeText } from "@/lib/utils";
import { OrderService } from "@/lib/services/order-service";
import { PricingPlanService } from "@/lib/services/pricing-plan-service";
import { CatalogService } from "@/lib/services/catalog-service";
import { ContentService } from "@/lib/services/content-service";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { broadcastOrderEvent } from "@/lib/services/order-realtime-service";
import { mapOrderRecord } from "@/lib/services/order-record-mapper";
import { orderToUnifiedInvoice } from "@/lib/invoice/invoice-utils";
import { sendInvoiceEmail, type InvoiceEmailPayload } from "@/lib/services/email-service";
import type { OrderStatus, PricingMode } from "@/types";

interface ManualOrderPayload {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  street_address: string;
  apt_unit?: string;
  city: string;
  state: string;
  zip_code: string;
  pricing_mode: PricingMode;
  bag_count?: number;
  estimated_weight_lbs?: number;
  detergent_id: string;
  detergent_name?: string;
  pickup_date: string;
  pickup_slot: "8am-12pm" | "1pm-6pm";
  delivery_date?: string;
  payment_method: "cash" | "bank" | "card";
  payment_status?: "paid" | "pending";
  order_status?: "confirmed" | "completed";
  is_out_of_home?: boolean;
  special_instructions?: string;
  send_email_copy?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const verified = await getVerifiedUser(req);
    if (!verified) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }
    if (verified.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden. Admin access required." }, { status: 403 });
    }

    if (!(await consumeRateLimit(req, "admin_manual_order", 30, 60, verified.user.id))) {
      return NextResponse.json({ success: false, error: "Rate limit exceeded. Try again in a minute." }, { status: 429 });
    }

    const body: ManualOrderPayload = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid order data." }, { status: 400 });
    }

    const customerName = sanitizeText(body.customer_name);
    const customerPhone = sanitizeText(body.customer_phone);
    const street = sanitizeText(body.street_address);
    const aptUnit = sanitizeText(body.apt_unit);
    const city = sanitizeText(body.city);
    const state = (sanitizeText(body.state) || "TX").toUpperCase();
    const zip = sanitizeText(body.zip_code);
    const pickupDate = sanitizeText(body.pickup_date);
    const pickupSlot = body.pickup_slot;
    const specialInstructions = sanitizeText(body.special_instructions) || "Phone order logged by admin.";

    if (!customerName || !customerPhone) {
      return NextResponse.json({ success: false, error: "Customer name and phone number are required." }, { status: 400 });
    }
    const cleanPhone = customerPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      return NextResponse.json({ success: false, error: "Please enter a valid 10-digit phone number." }, { status: 400 });
    }
    if (!street || !city || !zip) {
      return NextResponse.json({ success: false, error: "Complete street address, city, and zip are required." }, { status: 400 });
    }
    if (!pickupDate || !pickupSlot) {
      return NextResponse.json({ success: false, error: "Pickup date and pickup window are required." }, { status: 400 });
    }
    const todayStr = new Date().toISOString().split("T")[0];
    if (pickupDate < todayStr) {
      return NextResponse.json({ success: false, error: "Pickup date cannot be in the past." }, { status: 400 });
    }

    const rawEmail = sanitizeText(body.customer_email);
    const customerEmail = rawEmail || `phone-${cleanPhone || "guest"}@call.laundryexpress.local`;

    const [pricing, catalog] = await Promise.all([
      PricingPlanService.getPricing(),
      CatalogService.getCatalog(),
    ]);

    const activeDetergents = catalog.detergents;
    const selectedDetergent = activeDetergents.find((d) => d.id === body.detergent_id) || activeDetergents[0];
    const detergentId = selectedDetergent?.id || body.detergent_id;
    if (!detergentId) {
      return NextResponse.json({ success: false, error: "Please select a valid detergent from the catalog." }, { status: 400 });
    }
    const detergentName = selectedDetergent?.name || body.detergent_name || "Wash Detergent";
    const detergentFee = Number(selectedDetergent?.price || 0);

    const mode = body.pricing_mode === "per_lb" ? "per_lb" : "per_bag";
    const bagCount = mode === "per_bag" ? Math.max(1, Number(body.bag_count) || 1) : 0;
    const estWeight = mode === "per_lb" ? Math.max(5, Number(body.estimated_weight_lbs) || 15) : 0;

    let subtotal = 0;
    let deliveryFee = 0;

    if (pricing) {
      if (mode === "per_bag") {
        subtotal = bagCount * pricing.bag_price;
        deliveryFee = bagCount >= pricing.free_delivery_threshold ? 0 : pricing.standard_delivery_fee;
      } else {
        subtotal = Math.round(estWeight * pricing.pound_price * 100) / 100;
        deliveryFee = estWeight >= pricing.free_delivery_lbs ? 0 : pricing.standard_delivery_fee;
      }
    } else {
      subtotal = mode === "per_bag" ? bagCount * 25 : estWeight * 1.75;
      deliveryFee = 4.99;
    }

    const totalAmount = Math.max(0, Math.round((subtotal + detergentFee + deliveryFee) * 100) / 100);
    const isPaid = body.payment_status === "paid";
    const paymentMethod = ["cash", "bank", "card"].includes(body.payment_method) ? body.payment_method : "cash";
    const targetStatus: OrderStatus = body.order_status === "completed" ? "completed" : "confirmed";

    const createdOrder = await OrderService.createOrder({
      user_id: undefined,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      street_address: street,
      apt_unit: aptUnit,
      city,
      state,
      zip_code: zip,
      pricing_mode: mode,
      bag_count: bagCount,
      estimated_weight_lbs: estWeight,
      detergent_id: detergentId,
      detergent_name: detergentName,
      detergent_fee: detergentFee,
      pickup_date: pickupDate,
      pickup_slot: pickupSlot,
      delivery_date: sanitizeText(body.delivery_date) || null,
      subtotal,
      delivery_fee: deliveryFee,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      is_out_of_home: Boolean(body.is_out_of_home),
      bag_outside_door_confirmed: Boolean(body.is_out_of_home),
      customer_notes: specialInstructions,
    });

    const supabase = createAdminSupabaseClient();
    const txId = isPaid
      ? `PHONE-${paymentMethod.toUpperCase()}-${randomBytes(4).toString("hex").toUpperCase()}`
      : undefined;

    const { data: updatedRecord } = await supabase
      .from("orders")
      .update({
        order_status: targetStatus,
        payment_status: isPaid ? "paid" : "pending",
        payment_method: paymentMethod,
        stripe_payment_intent_id: txId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", createdOrder.id)
      .select("*, proofs:order_proofs(*)")
      .single();

    const finalOrder = updatedRecord ? mapOrderRecord(updatedRecord) : createdOrder;

    void broadcastOrderEvent({
      eventType: isPaid ? "order_paid" : "order_created",
      orderId: finalOrder.id,
      orderNumber: finalOrder.order_number,
      orderStatus: finalOrder.order_status,
      paymentStatus: finalOrder.payment_status,
      customerEmail: finalOrder.customer_email,
      customerName: finalOrder.customer_name,
      totalAmount: finalOrder.total_amount,
      pickupDate: finalOrder.pickup_date,
      pickupSlot: finalOrder.pickup_slot,
      updatedAt: finalOrder.updated_at,
    });

    // Automatically send invoice email if customer provided real email
    let emailSent = false;
    const isRealEmail = rawEmail && !rawEmail.includes("@call.laundryexpress.local") && body.send_email_copy !== false;
    if (isRealEmail) {
      try {
        const settings = await ContentService.getSettings();
        const invoicePayload = orderToUnifiedInvoice(finalOrder, {
          customerEmail: rawEmail,
          slotTimes: settings ? { s1: settings.slot1_start, e1: settings.slot1_end, s2: settings.slot2_start, e2: settings.slot2_end } : undefined,
        });
        await sendInvoiceEmail(invoicePayload as unknown as InvoiceEmailPayload);
        await OrderService.markInvoiceEmailSent(finalOrder.id);
        emailSent = true;
      } catch (err) {
        console.error("[manual-order] Error sending invoice email:", err);
      }
    }

    return NextResponse.json({ success: true, order: finalOrder, emailSent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record manual phone order.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

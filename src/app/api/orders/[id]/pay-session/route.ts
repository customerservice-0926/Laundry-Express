import { NextResponse, type NextRequest } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/stripe-server";
import { mapOrderRecord } from "@/lib/services/order-record-mapper";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Order ID required" }, { status: 400 });
    }

    if (!stripe) {
      return NextResponse.json({ success: false, error: "Payment processor is unavailable" }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const tipAmount = Math.max(0, Math.round(Number(body.tipAmount || 0) * 100) / 100);
    const clientSessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";

    const supabase = createAdminSupabaseClient();
    const isUuid = UUID_PATTERN.test(id);
    const query = supabase.from("orders").select("*, proofs:order_proofs(*)");
    const { data: record, error } = isUuid
      ? await query.eq("id", id).maybeSingle()
      : await query.eq("order_number", id).maybeSingle();

    if (error || !record) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const order = mapOrderRecord(record);
    if (order.payment_status === "paid") {
      return NextResponse.json({ success: true, alreadyPaid: true, orderNumber: order.order_number });
    }

    const baseAmount = Math.max(
      0,
      Math.round(
        (order.subtotal +
          (order.detergent_fee || 0) +
          (order.additional_items_fee || 0) +
          (order.delivery_fee || 0) -
          (order.discount_amount || 0)) *
          100
      ) / 100
    );
    const newTotal = Math.max(0, Math.round((baseAmount + tipAmount) * 100) / 100);

    const currentPickupAddr = (record.pickup_address && typeof record.pickup_address === "object")
      ? (record.pickup_address as Record<string, unknown>)
      : {};
    const updatedPickupAddr = { ...currentPickupAddr, tip_amount: tipAmount };

    // Persist selected tip amount and updated total
    const { error: tipUpdateErr } = await supabase
      .from("orders")
      .update({
        tip_amount: tipAmount,
        total_amount: newTotal,
        pickup_address: updatedPickupAddr,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (tipUpdateErr && (tipUpdateErr.message.includes("schema cache") || tipUpdateErr.message.includes("column"))) {
      await supabase
        .from("orders")
        .update({
          total_amount: newTotal,
          pickup_address: updatedPickupAddr,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);
    }

    const origin = req.nextUrl.origin;
    const isPerLb = order.pricing_mode === "per_lb";

    let customerId = order.stripe_customer_id;
    if (!customerId && order.customer_email) {
      const existing = await stripe.customers.list({ email: order.customer_email, limit: 1 });
      if (existing.data.length > 0) customerId = existing.data[0].id;
      else {
        const created = await stripe.customers.create({
          email: order.customer_email, name: order.customer_name || order.customer_email,
          metadata: { order_id: order.id, order_number: order.order_number },
        });
        customerId = created.id;
      }
    }

    const deliveryFee = Math.max(0, Number(order.delivery_fee || 0));
    const initialDue = Math.max(0, Math.round((deliveryFee + tipAmount) * 100) / 100);
    const cancelUrl = `${origin}/order/pay/${order.order_number}${clientSessionId ? `?session_id=${clientSessionId}` : ""}`;
    let session;

    if (initialDue > 0) {
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
        customer_email: !customerId ? (order.customer_email || undefined) : undefined,
        customer_update: customerId ? { address: "auto", name: "auto" } : undefined,
        line_items: lineItems,
        success_url: `${origin}/order/success?order_id=${order.order_number}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
          checkout_type: "initial_tip_delivery",
          delivery_fee: String(deliveryFee),
          tip_amount: String(tipAmount),
        },
        payment_intent_data: {
          setup_future_usage: "off_session",
          metadata: {
            order_id: order.id,
            order_number: order.order_number,
          },
        },
      });
    } else {
      session = await stripe.checkout.sessions.create({
        mode: "setup",
        payment_method_types: ["card"],
        customer: customerId || undefined,
        customer_email: !customerId ? (order.customer_email || undefined) : undefined,
        success_url: `${origin}/order/success?order_id=${order.order_number}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
          checkout_type: "initial_tip_delivery",
          delivery_fee: "0",
          tip_amount: "0",
        },
      });
    }

    await supabase
      .from("orders")
      .update({
        stripe_checkout_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    return NextResponse.json({ success: true, url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to initialize payment session";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

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

    // Persist selected tip amount and updated total
    await supabase
      .from("orders")
      .update({
        tip_amount: tipAmount,
        total_amount: newTotal,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    const origin = req.nextUrl.origin;
    const isPerLb = order.pricing_mode === "per_lb";

    if (isPerLb) {
      const session = await stripe.checkout.sessions.create({
        mode: "setup",
        payment_method_types: ["card"],
        customer_email: order.customer_email || undefined,
        success_url: `${origin}/order/success?order_id=${order.order_number}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/order/pay/${order.order_number}`,
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
          tip_amount: String(tipAmount),
        },
      });

      return NextResponse.json({ success: true, url: session.url });
    }

    const lineItems: Array<{
      price_data: {
        currency: string;
        product_data: { name: string; description?: string };
        unit_amount: number;
      };
      quantity: number;
    }> = [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Laundry Express Order #${order.order_number}`,
            description: `${order.pricing_mode === "package" ? "Saver Package" : `${order.bag_count} Bag(s)`} Doorstep Wash & Fold`,
          },
          unit_amount: Math.round(baseAmount * 100),
        },
        quantity: 1,
      },
    ];

    if (tipAmount > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Driver & Crew Gratuity (Tip)",
            description: "100% goes directly to our delivery drivers and laundry attendants",
          },
          unit_amount: Math.round(tipAmount * 100),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: order.customer_email || undefined,
      line_items: lineItems,
      success_url: `${origin}/order/success?order_id=${order.order_number}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/order/pay/${order.order_number}`,
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        tip_amount: String(tipAmount),
      },
    });

    return NextResponse.json({ success: true, url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to initialize payment session";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

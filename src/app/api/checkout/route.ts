import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { OrderService } from "@/lib/services/order-service";
import { PricingPlanService } from "@/lib/services/pricing-plan-service";
import { CatalogService } from "@/lib/services/catalog-service";
import { CouponService, type CouponItem } from "@/lib/services/coupon-service";
import { calculateOrderPrice } from "@/lib/stripe/pricing-calc";
import { getVerifiedUser } from "@/lib/auth-request";
import { validateCheckoutPayload } from "@/lib/checkout-validation";
import { syncUserOrderContact } from "@/lib/services/checkout-sync-service";
import { validateOrderAvailability } from "@/lib/services/booking-availability-service";

const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey, {
  // @ts-expect-error -- Pin the API version used by this integration.
  apiVersion: "2024-12-18.acacia",
}) : null;

export async function GET(req: NextRequest) {
  try {
    const verified = await getVerifiedUser(req);
    if (!verified?.user.id) return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    const { user } = verified;
    const orderNumber = req.nextUrl.searchParams.get("order_id");
    if (!orderNumber) return NextResponse.json({ success: false, error: "Missing order identifier" }, { status: 400 });

    const order = await OrderService.getOrderByNumber(orderNumber);
    if (!order) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    if (user.role !== "admin" && order.user_id !== user.id && order.customer_email?.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
    }

    return NextResponse.json({ success: true, paid: order.payment_status === "paid", order, customerName: order.customer_name, customerEmail: order.customer_email });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to retrieve order";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const verified = await getVerifiedUser(req);
    if (!verified) return NextResponse.json({ success: false, error: "Sign in before placing an order." }, { status: 401 });
    const { user } = verified;
    const body = await req.json().catch(() => null);
    const payloadError = validateCheckoutPayload(body);
    if (payloadError) return NextResponse.json({ success: false, error: payloadError }, { status: 400 });

    const availabilityError = await validateOrderAvailability({
      pickup_date: body.pickup_date,
      pickup_slot: body.pickup_slot,
      city: body.city,
      zip_code: body.zip_code,
      delivery_date: typeof body.delivery_date === "string" ? body.delivery_date : undefined,
    });
    if (availabilityError) return NextResponse.json({ success: false, error: availabilityError }, { status: 400 });

    const paymentMethod = body.payment_method;
    if (!stripe) return NextResponse.json({ success: false, error: "Online payment is temporarily unavailable." }, { status: 503 });

    const pricing = await PricingPlanService.getPricing();
    if (!pricing) return NextResponse.json({ success: false, error: "Pricing has not been configured. Please try again later." }, { status: 503 });

    if (body.pricing_mode === "per_bag" && (!Number.isInteger(body.bag_count) || body.bag_count < pricing.min_bags || body.bag_count > pricing.max_bags)) {
      return NextResponse.json({ success: false, error: `Bag quantity must be between ${pricing.min_bags} and ${pricing.max_bags}.` }, { status: 400 });
    }
    if (body.pricing_mode === "per_lb" && (typeof body.estimated_weight_lbs !== "number" || body.estimated_weight_lbs < pricing.min_lbs || body.estimated_weight_lbs > pricing.max_lbs)) {
      return NextResponse.json({ success: false, error: `Laundry weight must be between ${pricing.min_lbs} and ${pricing.max_lbs} lbs.` }, { status: 400 });
    }

    const pkg = body.pricing_mode === "package"
      ? (await PricingPlanService.getPlans()).find((p) => p.id === body.package_id && p.is_active)
      : undefined;
    if (body.pricing_mode === "package" && !pkg) return NextResponse.json({ success: false, error: "This package is no longer available." }, { status: 400 });
    if (pkg) {
      body.bag_count = pkg.unit_type === "bag" ? pkg.capacity : 0;
      body.estimated_weight_lbs = pkg.unit_type === "lb" ? pkg.capacity : 0;
    }

    const { detergents } = await CatalogService.getCatalog();
    const detergent = detergents.find((d) => d.id === body.detergent_id);
    if (!detergent?.is_active) return NextResponse.json({ success: false, error: "Choose an available detergent before checkout." }, { status: 400 });
    const detergentFee = detergent ? detergent.price : 0;

    const priceInput = {
      pricing_mode: body.pricing_mode, bag_count: body.bag_count, estimated_weight_lbs: body.estimated_weight_lbs, detergent_fee: detergentFee,
      base_bag_price: pricing.base_bag_price, base_pound_price: pricing.base_pound_price, min_bags: pricing.min_bags, max_bags: pricing.max_bags,
      min_lbs: pricing.min_lbs, max_lbs: pricing.max_lbs, free_delivery_lbs: pricing.free_delivery_lbs, one_bag_delivery_fee: pricing.one_bag_delivery_fee, free_delivery_threshold: pricing.free_delivery_threshold,
      package: pkg ? { price: pkg.discounted_price, capacity: pkg.capacity, unit_type: pkg.unit_type } : undefined,
    };

    let validatedCoupon: CouponItem | undefined;
    if (body.promo_code) {
      const preliminaryPrice = calculateOrderPrice(priceInput);
      const couponCheck = await CouponService.validateCoupon(body.promo_code, preliminaryPrice.subtotal);
      if (couponCheck.valid && couponCheck.coupon) validatedCoupon = couponCheck.coupon;
      else return NextResponse.json({ success: false, error: couponCheck.error || "Invalid coupon code." }, { status: 400 });
    }

    const serverPrice = calculateOrderPrice({
      ...priceInput,
      promo: validatedCoupon ? { code: validatedCoupon.code, discount_type: validatedCoupon.discount_type, discount_value: validatedCoupon.discount_value } : undefined,
    });

    const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
    const originUrl = new URL(configuredOrigin);
    if (originUrl.protocol !== "https:" && originUrl.hostname !== "localhost") {
      return NextResponse.json({ success: false, error: "Checkout requires a secure site URL." }, { status: 503 });
    }
    const origin = originUrl.origin;
    // Here need to update
    if (Math.round(serverPrice.total_amount * 100) < 0) return NextResponse.json({ success: false, error: "The order total is below Stripe's minimum payment amount." }, { status: 400 });

    const createdOrder = await OrderService.createOrder({
      ...body,
      package_id: pkg?.id || null,
      package_name: pkg?.name || null,
      detergent_name: detergent.name,
      user_id: user.id,
      customer_name: user.full_name,
      customer_email: user.email,
      customer_phone: body.customer_phone || user.phone || "",
      subtotal: serverPrice.subtotal,
      detergent_fee: serverPrice.detergent_fee,
      delivery_fee: serverPrice.delivery_fee,
      discount_amount: serverPrice.discount_amount,
      coupon_code: validatedCoupon?.code || null,
      tax_amount: serverPrice.tax_amount,
      total_amount: serverPrice.total_amount,
      payment_method: paymentMethod,
      payment_status: "pending",
      order_status: "pending",
    });

    await syncUserOrderContact(user, body);

    const netServiceAmountCents = Math.round((serverPrice.subtotal + serverPrice.detergent_fee - serverPrice.discount_amount) * 100);
    const deliveryFeeCents = Math.round(serverPrice.delivery_fee * 100);
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Laundry Express — ${pkg ? pkg.name : createdOrder.pricing_mode === "per_bag" ? "By The Bag Wash & Fold" : "By The Pound (lb)"}`,
            description: `${createdOrder.pricing_mode === "per_lb" || pkg?.unit_type === "lb" ? `${createdOrder.estimated_weight_lbs} lbs` : `${createdOrder.bag_count} Bag(s)`} • Cold Water Gentle Care • 24hr Return`,
            images: [`${origin}/brand/logo-badge.jpg`],
          },
          unit_amount: netServiceAmountCents,
        },
        quantity: 1,
      },
    ];

    if (deliveryFeeCents > 0) {
      lineItems.push({
        price_data: { currency: "usd", product_data: { name: "Doorstep Pickup & Return Delivery", description: "Doorstep pickup and 24hr return delivery" }, unit_amount: deliveryFeeCents },
        quantity: 1,
      });
    }

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"], line_items: lineItems, mode: "payment", customer_email: user.email,
        success_url: `${origin}/order/success?session_id={CHECKOUT_SESSION_ID}&order_id=${encodeURIComponent(createdOrder.order_number)}`,
        cancel_url: `${origin}/order?canceled=true&order_id=${createdOrder.order_number}`,
        metadata: { order_id: createdOrder.id, order_number: createdOrder.order_number, user_id: createdOrder.user_id || "", pickup_date: createdOrder.pickup_date || "", pickup_slot: createdOrder.pickup_slot || "" },
        payment_intent_data: { metadata: { order_number: createdOrder.order_number, order_id: createdOrder.id } },
      });
    } catch (error) {
      await OrderService.markOrderPaymentFailed(createdOrder.order_number);
      throw error;
    }

    try {
      await OrderService.saveCheckoutSessionId(createdOrder.id, session.id);
    } catch (error) {
      try { await stripe.checkout.sessions.expire(session.id); await OrderService.markOrderPaymentFailed(createdOrder.id); } catch { }
      throw error;
    }
    if (!session.url) {
      try { await stripe.checkout.sessions.expire(session.id); await OrderService.markOrderPaymentFailed(createdOrder.id); } catch { }
      throw new Error("Stripe did not provide a checkout URL.");
    }

    return NextResponse.json({ success: true, checkoutUrl: session.url, order: createdOrder }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create checkout session";
    if (msg.includes("fully booked")) {
      return NextResponse.json({ success: false, error: msg }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

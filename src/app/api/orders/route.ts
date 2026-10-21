import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { OrderService } from "@/lib/services/order-service";
import { sendOrderCancellationEmail } from "@/lib/services/cancellation-email";
import { sendReviewRequestEmail } from "@/lib/services/email-service";
import { generateReviewToken } from "@/lib/services/review-token-service";
import { getVerifiedUser } from "@/lib/auth-request";
import type { OrderStatus } from "@/types";

const ORDER_STATUSES: OrderStatus[] = [
  "pending", "confirmed", "driver_assigned", "picked_up",
  "in_wash", "out_for_delivery", "completed", "cancelled",
];
const PROOF_TYPES = ["pickup", "dropoff", "damage"] as const;

function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && ORDER_STATUSES.some((status) => status === value);
}

function isProofType(value: unknown): value is typeof PROOF_TYPES[number] {
  return typeof value === "string" && PROOF_TYPES.some((proofType) => proofType === value);
}


/**
 * /api/orders
 * Dynamic endpoint for customer bookings & administrative fulfillment pipeline
 */

export async function GET(req: NextRequest) {
  try {
    const verified = await getVerifiedUser(req);
    if (!verified) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }
    const { user } = verified;
    const isAdmin = user.role === "admin";
    const userId = isAdmin ? undefined : user.id;
    const userEmail = isAdmin ? undefined : user.email;

    if (!isAdmin && req.nextUrl.searchParams.has("userId")) {
      return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
    }

    const orders = await OrderService.getOrders(userId, userEmail);
    return NextResponse.json({ success: true, orders }, { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load orders";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json(
    { success: false, error: "Use the secure checkout endpoint to place an order." },
    { status: 405, headers: { Allow: "GET, PATCH" } }
  );
}

export async function PATCH(req: NextRequest) {
  try {
    const verified = await getVerifiedUser(req);
    if (!verified || verified.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden. Admin authorization required." }, { status: 403 });
    }

    const body: unknown = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ success: false, error: "A JSON object is required." }, { status: 400 });
    }
    const { orderId, status, finalWeight, proofType, imageUrl, notes, cancelReason, cancelNotes } = body as Record<string, unknown>;

    const validatedStatus = isOrderStatus(status) ? status : undefined;
    const validatedProofType = isProofType(proofType) ? proofType : undefined;
    const validImageUrl = typeof imageUrl === "string" ? imageUrl.trim() : "";
    if (typeof orderId !== "string" || !orderId.trim()) {
      return NextResponse.json({ success: false, error: "Order ID is required." }, { status: 400 });
    }
    const hasStatus = status !== undefined;
    const hasWeight = finalWeight !== undefined;
    const hasProof = proofType !== undefined || imageUrl !== undefined || notes !== undefined;
    if (
      (hasStatus && !validatedStatus) ||
      (hasWeight && (typeof finalWeight !== "number" || !Number.isFinite(finalWeight) || finalWeight <= 0)) ||
      (hasProof && (!validatedProofType || !validImageUrl ||
        (notes !== undefined && (typeof notes !== "string" || notes.length > 500)))) ||
      (!hasStatus && !hasWeight && !hasProof)
    ) {
      return NextResponse.json({ success: false, error: "Provide valid order status, final weight, or proof details." }, { status: 400 });
    }
    if (validatedStatus === "cancelled" && (hasWeight || hasProof)) {
      return NextResponse.json({ success: false, error: "Cancel an order separately from other updates." }, { status: 400 });
    }
    if (validatedStatus) {
      if (validatedStatus === "cancelled") {
        const order = await OrderService.getOrderByNumber(orderId);
        if (!order) return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
        if (order.order_status === "completed") {
          return NextResponse.json({ success: false, error: "Completed orders cannot be cancelled." }, { status: 409 });
        }

        const hasStripeCheckout = typeof order.payment_method === "string" &&
          ["card", "apple_pay"].includes(order.payment_method);
        if (order.order_status !== "cancelled" && hasStripeCheckout && order.payment_status !== "paid" && order.payment_status !== "refunded") {
          const checkoutSessionId = await OrderService.getCheckoutSessionId(order.id);
          if (!checkoutSessionId) {
            return NextResponse.json({ success: false, error: "This checkout session cannot be verified. Confirm its payment status before cancelling." }, { status: 409 });
          }
          const stripeSecret = process.env.STRIPE_SECRET_KEY;
          if (!stripeSecret) {
            return NextResponse.json({ success: false, error: "Stripe is not configured to safely cancel this checkout." }, { status: 503 });
          }
          const stripe = new Stripe(stripeSecret, {
            // @ts-expect-error -- Pin the API version used by this integration.
            apiVersion: "2024-12-18.acacia",
          });
          let session = await stripe.checkout.sessions.retrieve(checkoutSessionId);
          if (session.status === "open") {
            try {
              session = await stripe.checkout.sessions.expire(session.id);
            } catch {
              session = await stripe.checkout.sessions.retrieve(session.id);
            }
          }
          if (session.status === "complete" && session.payment_status !== "paid") {
            return NextResponse.json({ success: false, error: "Payment is still processing. Refresh the order before cancelling." }, { status: 409 });
          }
          if (session.status !== "expired" && !(session.status === "complete" && session.payment_status === "paid")) {
            return NextResponse.json({ success: false, error: "Stripe did not confirm that checkout was closed. The order was not cancelled." }, { status: 409 });
          }
          if (session.status === "expired") await OrderService.markOrderPaymentFailed(order.id);
        }
        await OrderService.updateOrderStatus(order.id, "cancelled");
        const cancelledOrder = await OrderService.getOrderByNumber(order.id);

        if (cancelledOrder) {
          const customerEmail = cancelledOrder.customer_email || cancelledOrder.user?.email || "";
          if (customerEmail) {
            const fullAddress = [
              cancelledOrder.street_address,
              cancelledOrder.apt_unit ? `Apt ${cancelledOrder.apt_unit}` : "",
              cancelledOrder.city,
              cancelledOrder.state,
              cancelledOrder.zip_code,
            ].filter(Boolean).join(", ") || cancelledOrder.pickup_address || "Doorstep Address";

            try {
              await sendOrderCancellationEmail({
                orderNumber: cancelledOrder.order_number,
                customerName: cancelledOrder.customer_name || cancelledOrder.user?.full_name || "Valued Customer",
                customerEmail,
                customerPhone: cancelledOrder.customer_phone || undefined,
                pickupDate: cancelledOrder.pickup_date,
                pickupSlot: cancelledOrder.pickup_slot,
                deliveryDate: cancelledOrder.delivery_date || undefined,
                planName: cancelledOrder.pricing_mode === "per_bag"
                  ? `${cancelledOrder.bag_count} Bag(s) (13-Gal)`
                  : cancelledOrder.pricing_mode === "per_lb"
                  ? `By the Pound (${cancelledOrder.estimated_weight_lbs || 0} lbs)`
                  : "Wash & Fold Package",
                address: fullAddress,
                totalAmount: cancelledOrder.total_amount,
                paymentStatus: cancelledOrder.payment_status || "pending",
                paymentMethod: cancelledOrder.payment_method || "card",
                reason: typeof cancelReason === "string" ? cancelReason : undefined,
                notes: typeof cancelNotes === "string" ? cancelNotes : undefined,
              });
            } catch (err) {
              console.error("[orders-api] Cancellation email failed:", err);
            }
          }
        }

        return NextResponse.json({
          success: true,
          message: "Order cancelled. Customer notified.",
          order: cancelledOrder,
        });
      }
      if (validatedStatus === "completed") {
        const existingOrd = await OrderService.getOrderByNumber(orderId);
        if (!existingOrd) return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
        if (existingOrd.payment_status === "pending" || existingOrd.payment_status === "failed") {
          return NextResponse.json({ success: false, error: "Cannot mark order as completed while payment is pending. Collect payment first." }, { status: 400 });
        }
      }
      if (validatedStatus === "pending") {
        const existingOrd = await OrderService.getOrderByNumber(orderId);
        if (!existingOrd) return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
        if (existingOrd.payment_status === "paid") {
          return NextResponse.json({ success: false, error: "Order status cannot be pending when payment has already been received." }, { status: 400 });
        }
      }
      await OrderService.updateOrderStatus(orderId, validatedStatus);
      if (validatedStatus === "completed") {
        try {
          const completedOrder = await OrderService.getOrderByNumber(orderId);
          if (completedOrder?.customer_email) {
            const origin = req.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || "https://laundryexpress.com";
            const planName = completedOrder.pricing_mode === "per_bag"
              ? `${completedOrder.bag_count || 1} Bag(s)`
              : completedOrder.pricing_mode === "per_lb"
              ? `By the Pound (${completedOrder.final_weight_lbs || completedOrder.estimated_weight_lbs || 15} lbs)`
              : "Wash & Fold Package";
            const reviewToken = generateReviewToken(completedOrder.order_number, completedOrder.id, completedOrder.customer_email);
            await sendReviewRequestEmail({
              orderNumber: completedOrder.order_number,
              customerName: completedOrder.customer_name || "Valued Customer",
              customerEmail: completedOrder.customer_email,
              deliveryDate: completedOrder.delivery_date || undefined,
              planName,
              reviewUrl: `${origin}/review/${encodeURIComponent(completedOrder.order_number)}?token=${encodeURIComponent(reviewToken)}`,
            });
          }
        } catch (err) {
          console.error("[orders-api] Review request email failed:", err);
        }
      }
    }
    if (typeof finalWeight === "number") {
      await OrderService.updateFinalWeight(orderId, finalWeight);
    }
    if (hasProof && validatedProofType && validImageUrl) {
      await OrderService.uploadProof(
        orderId,
        validatedProofType,
        validImageUrl,
        typeof notes === "string" ? notes : undefined
      );
    }

    return NextResponse.json({ success: true, message: "Order successfully updated." });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update order";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

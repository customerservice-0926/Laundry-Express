import { NextResponse, type NextRequest } from "next/server";
import { getVerifiedUser } from "@/lib/auth-request";
import { OrderBillingService } from "@/lib/services/order-billing-service";

/**
 * POST /api/orders/charge-weight
 * Admin endpoint: Confirm actual scale weight and charge customer's saved card off-session.
 */
export async function POST(req: NextRequest) {
  try {
    const verified = await getVerifiedUser(req);
    if (!verified || verified.user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden. Administrative access required." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "A JSON payload is required." }, { status: 400 });
    }

    const { orderId, finalWeightLbs, customPoundRate, proofImageUrl } = body as Record<string, unknown>;
    if (typeof orderId !== "string" || !orderId.trim()) {
      return NextResponse.json({ success: false, error: "Order ID is required." }, { status: 400 });
    }

    const weightNum = Number(finalWeightLbs);
    if (!Number.isFinite(weightNum) || weightNum <= 0) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid scale weight in lbs (greater than 0)." },
        { status: 400 }
      );
    }

    const rateNum = typeof customPoundRate === "number" && customPoundRate > 0 ? customPoundRate : undefined;
    const proofUrl = typeof proofImageUrl === "string" && proofImageUrl.trim() ? proofImageUrl.trim() : undefined;

    const result = await OrderBillingService.chargePerPoundFinalWeight(orderId.trim(), weightNum, {
      customPoundRate: rateNum,
      proofImageUrl: proofUrl,
    });
    if (!result.success) {
      console.warn("[charge-weight] failed for order", orderId, result.error);
      return NextResponse.json(
        { success: false, error: result.error || "Unable to charge customer card.", cardDeclined: result.cardDeclined },
        { status: result.cardDeclined ? 402 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully charged customer for ${weightNum} lbs.`,
      order: result.order,
      totalAmount: result.totalAmount,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to charge order.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

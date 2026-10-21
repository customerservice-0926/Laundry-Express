import { NextResponse, type NextRequest } from "next/server";
import { OrderPaymentLinkService } from "@/lib/services/order-payment-link-service";
import { getVerifiedUser } from "@/lib/auth-request";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const verified = await getVerifiedUser(req);
    if (!verified || verified.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Admin access required." }, { status: 403 });
    }
    const { id } = await params;
    if (!id) return NextResponse.json({ success: false, error: "Order ID required." }, { status: 400 });

    const origin = req.nextUrl.origin || process.env.NEXT_PUBLIC_SITE_URL || "https://www.laundryexpressservices.com";
    const result = await OrderPaymentLinkService.createAndSendPaymentLink(id, origin, {
      sendEmail: true,
      expiresInMinutes: 30,
    });

    return NextResponse.json({
      success: true,
      message: result.emailSent
        ? "Payment checkout link emailed to customer (valid for 30 minutes)."
        : "Payment link generated (valid for 30 minutes).",
      checkoutUrl: result.checkoutUrl,
      sessionId: result.sessionId,
      expiresAt: result.expiresAt,
      emailSent: result.emailSent,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to generate payment link.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

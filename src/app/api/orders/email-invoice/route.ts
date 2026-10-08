import { NextResponse, type NextRequest } from "next/server";
import { OrderService } from "@/lib/services/order-service";
import { ContentService } from "@/lib/services/content-service";
import { sendInvoiceEmail, type InvoiceEmailPayload } from "@/lib/services/email-service";
import { orderToUnifiedInvoice } from "@/lib/invoice/invoice-utils";
import { getVerifiedUser } from "@/lib/auth-request";

/**
 * POST /api/orders/email-invoice
 * Sends invoice email to customer + admin via Nodemailer.
 * Slot times are loaded from admin settings — fully dynamic.
 */
export async function POST(req: NextRequest) {
  try {
    const verified = await getVerifiedUser(req);
    if (!verified) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }
    const { user } = verified;

    const body = await req.json().catch(() => ({}));
    const { orderId, orderNumber } = body;

    const identifier = orderNumber || orderId;
    if (!identifier) {
      return NextResponse.json({ success: false, error: "Order identifier required" }, { status: 400 });
    }
    const [order, settings] = await Promise.all([
      OrderService.getOrderByNumber(identifier),
      ContentService.getSettings(),
    ]);

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }
    if (user.role !== "admin" && order.payment_status !== "paid") {
      return NextResponse.json({ success: false, error: "Invoice is available after payment is confirmed." }, { status: 409 });
    }
    if (
      user.role !== "admin" &&
      order.user_id !== user.id &&
      order.customer_email?.toLowerCase() !== user.email.toLowerCase()
    ) {
      return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
    }
    if (order.invoice_email_sent_at) {
      return NextResponse.json({ success: true, message: "Invoice was already sent.", orderNumber: order.order_number });
    }

    const invoicePayload = orderToUnifiedInvoice(order, {
      slotTimes: settings
        ? { s1: settings.slot1_start, e1: settings.slot1_end, s2: settings.slot2_start, e2: settings.slot2_end }
        : undefined,
    });

    await sendInvoiceEmail(invoicePayload as unknown as InvoiceEmailPayload);
    await OrderService.markInvoiceEmailSent(order.id);

    return NextResponse.json({
      success: true,
      message: "Invoice sent to the order email and administrator.",
      orderNumber: order.order_number,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to send invoice email";
    console.error("[email-invoice]", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

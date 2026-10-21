import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";
import { createEmailInvoicePdf } from "@/lib/invoice/email-invoice-pdf";
import { generateInvoiceHtml } from "@/lib/invoice/invoice-html-template";

// ---------------------------------------------------------------------------
// Transport — configure via env vars. Supports any SMTP provider:
//   Gmail: host=smtp.gmail.com, port=587, user=you@gmail.com, pass=app-password
//   Brevo: host=smtp-relay.brevo.com, port=587
//   Mailgun, SendGrid, etc. — all standard SMTP
// ---------------------------------------------------------------------------
export function createTransport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) throw new Error("SMTP_HOST, SMTP_USER, and SMTP_PASS must be configured.");
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });
}

export function getMailAddresses() {
  const from = process.env.EMAIL_FROM;
  const admin = process.env.ADMIN_EMAIL;
  if (!from || !admin) throw new Error("EMAIL_FROM and ADMIN_EMAIL must be configured.");
  return { from, admin };
}

/** Send 6-digit OTP verification email */
export async function sendOtpEmail(to: string, otp: string, purpose: string): Promise<void> {
  const label = purpose === "change_password"
    ? "Change Password"
    : purpose === "register_email"
      ? "Email Verification"
      : "Reset Password";
  const transport = createTransport();
  const { from } = getMailAddresses();
  await transport.sendMail({
    from,
    to,
    subject: "Your Laundry Express Verification Code",
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto;padding:32px 24px;background:#f8fafc;border-radius:16px">
        <h1 style="font-size:20px;font-weight:900;color:#0f172a;margin-bottom:4px">Laundry Express</h1>
        <p style="color:#64748b;font-size:13px;margin-bottom:24px">${label} Verification</p>
        <div style="background:#fff;border:2px solid #e2e8f0;border-radius:12px;padding:24px;text-align:center">
          <p style="color:#64748b;font-size:13px;margin:0 0 8px">Your one-time verification code</p>
          <div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#0f172a;font-family:monospace">${otp}</div>
          <p style="color:#94a3b8;font-size:11px;margin:12px 0 0">Expires in 10 minutes &middot; Do not share this code</p>
        </div>
        <p style="color:#94a3b8;font-size:11px;margin-top:20px;text-align:center">If you did not request this, ignore this email.</p>
      </div>
    `,
  });
}

export interface InvoiceEmailPayload {
  orderNumber: string;
  orderDate: string;
  paymentMethod: string;
  transactionId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  pickupDate: string;
  pickupSlot: string;
  deliveryDate: string;
  planName: string;
  quantity: string;
  detergent: string;
  detergentFee?: number;
  subtotal: number;
  deliveryFee: number;
  additionalItemsFee?: number;
  additionalItems?: { name: string; price: number; quantity: number }[];
  tipAmount?: number;
  discountAmount: number;
  totalAmount: number;
  address: string;
  specialRequest?: string;
  orderCancelled?: boolean;
}

export async function sendInvoiceEmail(payload: InvoiceEmailPayload): Promise<void> {
  if (!payload.customerEmail) throw new Error("Customer email is required for invoice delivery.");
  const { from, admin } = getMailAddresses();

  const unifiedInvoice = {
    ...payload,
    orderId: payload.orderNumber,
  };

  const html = generateInvoiceHtml(unifiedInvoice);

  const transport = createTransport();
  const invoicePdf = createEmailInvoicePdf(unifiedInvoice);
  const attachment = {
    filename: `LaundryExpress-Invoice-${payload.orderNumber.replace(/[^A-Za-z0-9-]/g, "")}.pdf`,
    content: invoicePdf,
    contentType: "application/pdf",
  };
  const logoPath = path.join(process.cwd(), "public", "brand", "logo-badge.jpeg");
  const logoAttachment = fs.existsSync(logoPath)
    ? {
        filename: "logo-badge.jpeg",
        path: logoPath,
        cid: "brand-logo-badge",
      }
    : null;
  const attachments = [attachment, ...(logoAttachment ? [logoAttachment] : [])];

  const [userResult, adminResult] = await Promise.allSettled([
    transport.sendMail({ from, to: payload.customerEmail, subject: `${payload.orderCancelled ? "Payment Received — Order Cancelled (No Refund Issued)" : "Order Confirmed"} — ${payload.orderNumber.replace(/[\r\n]/g, " ")} | Laundry Express`, html, attachments }),
    transport.sendMail({ from, to: admin, subject: `${payload.orderCancelled ? "Payment for Cancelled Order (No Refund Issued)" : "New Order"} — ${payload.orderNumber.replace(/[\r\n]/g, " ")} | ${payload.customerName.replace(/[\r\n]/g, " ")}`, html, attachments }),
  ]);

  const errors: string[] = [];
  if (userResult.status === "rejected") errors.push(`User email: ${userResult.reason}`);
  if (adminResult.status === "rejected") errors.push(`Admin email: ${adminResult.reason}`);
  if (errors.length > 0) throw new Error(errors.join("; "));
}

export interface PaymentCheckoutEmailPayload {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  checkoutUrl: string;
  pickupDate: string;
  pickupSlot: string;
  planName?: string;
  expiresInMinutes?: number;
}

export async function sendPaymentCheckoutEmail(payload: PaymentCheckoutEmailPayload): Promise<void> {
  if (!payload.customerEmail) throw new Error("Customer email is required for payment link delivery.");
  const { from } = getMailAddresses();
  const transport = createTransport();
  const minutes = payload.expiresInMinutes || 30;

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:540px;margin:auto;padding:28px 20px;background:#f8fafc;border-radius:20px;color:#0f172a">
      <div style="text-align:center;margin-bottom:20px">
        <h1 style="font-size:20px;font-weight:900;letter-spacing:-0.5px;color:#0f172a;margin:0">LAUNDRY EXPRESS</h1>
        <p style="color:#64748b;font-size:11px;margin:3px 0 0;font-weight:600;text-transform:uppercase;letter-spacing:1px">Doorstep Wash &amp; Fold Service</p>
      </div>
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:24px 20px;box-shadow:0 2px 8px rgba(15,23,42,0.04)">
        <span style="display:inline-block;padding:3px 10px;background:#fef3c7;color:#92400e;border-radius:999px;font-size:10px;font-weight:800;text-transform:uppercase;margin-bottom:10px">Payment Required</span>
        <h2 style="font-size:17px;font-weight:800;color:#0f172a;margin:0 0 6px">Complete Payment for Order #${payload.orderNumber}</h2>
        <p style="font-size:13px;color:#475569;line-height:1.5;margin:0 0 16px">
          Hi ${payload.customerName || "there"}, your laundry order has been scheduled. Please complete payment to confirm your pickup.
        </p>
        <div style="background:#f1f5f9;border-radius:10px;padding:12px 14px;margin-bottom:16px">
          <table style="width:100%;font-size:12px;color:#334155;border-collapse:collapse">
            <tr><td style="padding:3px 0;color:#64748b">Service:</td><td style="padding:3px 0;font-weight:700;text-align:right">${payload.planName || "Wash & Fold"}</td></tr>
            <tr><td style="padding:3px 0;color:#64748b">Pickup Window:</td><td style="padding:3px 0;font-weight:700;text-align:right">${payload.pickupDate} (${payload.pickupSlot})</td></tr>
            <tr style="border-top:1px solid #cbd5e1"><td style="padding:6px 0 0;font-weight:800;color:#0f172a">Total Due:</td><td style="padding:6px 0 0;font-weight:900;color:#0f172a;font-size:15px;text-align:right">$${payload.totalAmount.toFixed(2)}</td></tr>
          </table>
        </div>
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px 14px;margin-bottom:20px;text-align:center">
          <p style="margin:0;font-size:11px;font-weight:700;color:#1e40af">⏱️ This secure payment link is valid for ${minutes} minutes.</p>
        </div>
        <div style="text-align:center;margin-bottom:16px">
          <a href="${payload.checkoutUrl}" style="display:inline-block;width:100%;box-sizing:border-box;background:#e11d48;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:800;font-size:13px;text-align:center">
            Complete Payment ($${payload.totalAmount.toFixed(2)}) &rarr;
          </a>
        </div>
        <p style="font-size:10px;color:#64748b;margin:0;text-align:center;word-break:break-all">
          Or copy and paste this link:<br/><a href="${payload.checkoutUrl}" style="color:#2563eb">${payload.checkoutUrl}</a>
        </p>
      </div>
      <div style="text-align:center;margin-top:16px;font-size:10px;color:#94a3b8">
        Need assistance? Reply directly to this email or contact Laundry Express support.
      </div>
    </div>
  `;

  await transport.sendMail({
    from,
    to: payload.customerEmail,
    subject: `Action Required: Complete Payment for Order #${payload.orderNumber} | Laundry Express`,
    html,
  });
}

export interface ReviewRequestEmailPayload {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  deliveryDate?: string;
  planName?: string;
  reviewUrl: string;
}

export async function sendReviewRequestEmail(payload: ReviewRequestEmailPayload): Promise<void> {
  if (!payload.customerEmail || payload.customerEmail.includes("@call.laundryexpress.local")) return;
  const { from } = getMailAddresses();
  const transport = createTransport();

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:540px;margin:auto;padding:28px 20px;background:#f8fafc;border-radius:20px;color:#0f172a">
      <div style="text-align:center;margin-bottom:20px">
        <h1 style="font-size:20px;font-weight:900;letter-spacing:-0.5px;color:#0f172a;margin:0">LAUNDRY EXPRESS</h1>
        <p style="color:#64748b;font-size:11px;margin:3px 0 0;font-weight:600;text-transform:uppercase;letter-spacing:1px">Doorstep Wash &amp; Fold Service</p>
      </div>
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:24px 20px;box-shadow:0 2px 8px rgba(15,23,42,0.04)">
        <span style="display:inline-block;padding:3px 10px;background:#ecfdf5;color:#065f46;border-radius:999px;font-size:10px;font-weight:800;text-transform:uppercase;margin-bottom:10px">&#10003; Order Delivered</span>
        <h2 style="font-size:17px;font-weight:800;color:#0f172a;margin:0 0 6px">How Was Your Clean? Rate Order #${payload.orderNumber}</h2>
        <p style="font-size:13px;color:#475569;line-height:1.5;margin:0 0 16px">
          Hi ${payload.customerName || "there"}, your laundry has been freshly washed, folded, and delivered. We hope everything is spotless!
        </p>
        <div style="background:#f1f5f9;border-radius:10px;padding:12px 14px;margin-bottom:16px">
          <table style="width:100%;font-size:12px;color:#334155;border-collapse:collapse">
            <tr><td style="padding:3px 0;color:#64748b">Service:</td><td style="padding:3px 0;font-weight:700;text-align:right">${payload.planName || "Wash & Fold"}</td></tr>
            <tr><td style="padding:3px 0;color:#64748b">Delivered:</td><td style="padding:3px 0;font-weight:700;text-align:right">${payload.deliveryDate || "Today"}</td></tr>
            <tr style="border-top:1px solid #cbd5e1"><td style="padding:6px 0 0;font-weight:800;color:#0f172a">Feedback:</td><td style="padding:6px 0 0;font-weight:900;color:#e11d48;font-size:14px;text-align:right">&#9733;&#9733;&#9733;&#9733;&#9733;</td></tr>
          </table>
        </div>
        <div style="background:#fff1f2;border:1px solid #fecdd3;border-radius:10px;padding:10px 14px;margin-bottom:20px;text-align:center">
          <p style="margin:0;font-size:11px;font-weight:700;color:#9f1239">&#11088; Your honest review helps us maintain 5-star quality and rewards our wash team!</p>
        </div>
        <div style="text-align:center;margin-bottom:16px">
          <a href="${payload.reviewUrl}" style="display:inline-block;width:100%;box-sizing:border-box;background:#e11d48;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:800;font-size:13px;text-align:center">
            Rate &amp; Review Your Experience &rarr;
          </a>
        </div>
        <p style="font-size:10px;color:#64748b;margin:0;text-align:center;word-break:break-all">
          Or copy and paste this link:<br/><a href="${payload.reviewUrl}" style="color:#2563eb">${payload.reviewUrl}</a>
        </p>
      </div>
      <div style="text-align:center;margin-top:16px;font-size:10px;color:#94a3b8">
        Thank you for choosing Laundry Express!
      </div>
    </div>
  `;

  await transport.sendMail({
    from,
    to: payload.customerEmail,
    subject: `How was your clean? Rate Order #${payload.orderNumber} | Laundry Express`,
    html,
  });
}

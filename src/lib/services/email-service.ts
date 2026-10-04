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
  discountAmount: number;
  totalAmount: number;
  address: string;
  specialRequest?: string;
  orderCancelled?: boolean;
}

export async function sendInvoiceEmail(payload: InvoiceEmailPayload): Promise<void> {
  if (!payload.customerEmail) throw new Error("Customer email is required for invoice delivery.");
  const { from, admin } = getMailAddresses();

  const html = generateInvoiceHtml({
    ...payload,
    orderId: payload.orderNumber,
  });

  const transport = createTransport();
  const invoicePdf = createEmailInvoicePdf(payload);
  const attachment = {
    filename: `LaundryExpress-Invoice-${payload.orderNumber.replace(/[^A-Za-z0-9-]/g, "")}.pdf`,
    content: invoicePdf,
    contentType: "application/pdf",
  };
  const logoPath = path.join(process.cwd(), "public", "brand", "logo-badge.jpg");
  const logoAttachment = fs.existsSync(logoPath)
    ? {
        filename: "logo-badge.jpg",
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

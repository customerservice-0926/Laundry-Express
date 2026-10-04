import { APP_CONFIG } from "@/lib/constants";
import { formatCurrency, formatPhone, resolveDetergentName } from "@/lib/utils";

export interface UnifiedInvoiceInput {
  orderId?: string;
  orderNumber?: string;
  orderDate: string;
  pickupDate: string;
  pickupSlot: string;
  deliveryDate: string;
  paymentMethod: string;
  totalAmount: number;
  subtotal?: number;
  detergentFee?: number;
  deliveryFee?: number;
  discountAmount?: number;
  transactionId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  address: string;
  planName?: string;
  quantity?: string;
  detergent?: string;
  specialRequest?: string;
  orderDetails?: {
    planName: string;
    quantity: string;
    detergent: string;
    specialRequest: string;
  };
  orderCancelled?: boolean;
}

function escapeHtml(value?: string): string {
  if (!value) return "";
  const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return value.replace(/[&<>"']/g, (c) => map[c] || c);
}

const methodLabel: Record<string, string> = {
  card: "Credit / Debit Card (Stripe)",
  apple_pay: "Apple Pay (Stripe)",
  stripe: "Stripe 256-bit Secure Checkout",
};

/** Generates email-safe HTML that faithfully matches the website's OrderInvoiceCard design */
export function generateInvoiceHtml(inv: UnifiedInvoiceInput): string {
  const orderId = escapeHtml(inv.orderId || inv.orderNumber || "LX-ORDER");
  const customerName = escapeHtml(inv.customerName || "Valued Customer");
  const customerEmail = escapeHtml(inv.customerEmail || "");
  const customerPhone = inv.customerPhone ? escapeHtml(formatPhone(inv.customerPhone)) : "";
  const address = escapeHtml(inv.address || "");
  const orderDate = escapeHtml(inv.orderDate || "");
  const pickupDate = escapeHtml(inv.pickupDate || "");
  const pickupSlot = escapeHtml(inv.pickupSlot || "");
  const deliveryDate = escapeHtml(inv.deliveryDate || "");
  const txId = escapeHtml(inv.transactionId || `STRIPE-TX-${orderId.replace(/[^A-Za-z0-9]/g, "").slice(-8).toUpperCase()}`);
  const planName = escapeHtml(inv.orderDetails?.planName || inv.planName || "Wash & Fold Service");
  const quantity = escapeHtml(inv.orderDetails?.quantity || inv.quantity || "1 Order");
  const rawDetergent = inv.orderDetails?.detergent || inv.detergent || "Hypoallergenic Eco-Wash";
  const detergentName = escapeHtml(resolveDetergentName(rawDetergent));
  const detergentFee = Number(inv.detergentFee || 0);
  const deliveryFee = Number(inv.deliveryFee || 0);
  const subtotal = inv.subtotal !== undefined ? Number(inv.subtotal) : Number(inv.totalAmount);
  const discountAmount = Number(inv.discountAmount || 0);
  const totalAmount = Number(inv.totalAmount || 0);
  const specialRequest = escapeHtml(inv.orderDetails?.specialRequest || inv.specialRequest || "Contactless Delivery");
  const paymentMethodKey = (inv.paymentMethod || "card").toLowerCase();
  const paymentDisplay = escapeHtml(methodLabel[paymentMethodKey] || paymentMethodKey.replace(/_/g, " "));

  const statusBg = inv.orderCancelled ? "#fff7ed" : "#ecfdf5";
  const statusBorder = inv.orderCancelled ? "#fed7aa" : "#a7f3d0";
  const statusColor = inv.orderCancelled ? "#c2410c" : "#047857";
  const statusText = inv.orderCancelled ? "PAID — ORDER CANCELLED" : "PAID &amp; CONFIRMED";

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || APP_CONFIG.url || "https://www.laundryexpressservices.com";
  const logoUrl = typeof window !== "undefined" ? "/brand/logo-badge.jpg" : `${siteUrl.replace(/\/$/, "")}/brand/logo-badge.jpg`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><meta name="color-scheme" content="light" /><meta name="supported-color-schemes" content="light" />
  <title>Invoice ${orderId} - Laundry Express</title>
  <style type="text/css">
    :root { color-scheme: light; supported-color-schemes: light; }
    body, table, td, p, a, span { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-collapse: collapse !important; }
    [data-ogsc] .light-card, [data-ogsb] .light-card { background-color: #ffffff !important; color: #0f172a !important; }
    @media (prefers-color-scheme: dark) {
      body, .bg-body { background-color: #f1f5f9 !important; }
      .light-card { background-color: #ffffff !important; color: #0f172a !important; }
      .sub-card { background-color: #f8fafc !important; }
    }
  </style>
</head>
<body class="bg-body" style="margin:0;padding:24px 0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f1f5f9" class="bg-body" style="background-color:#f1f5f9;table-layout:fixed">
    <tr><td align="center" style="padding:0 12px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="light-card" style="max-width:620px;margin:0 auto;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,0.04)">
        <tr><td height="5" style="height:5px;background-color:#be185d;line-height:5px;font-size:1px">&nbsp;</td></tr>
        <tr><td bgcolor="#f8fafc" class="sub-card" style="padding:20px;background-color:#f8fafc;border-bottom:1px solid #e2e8f0">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td valign="middle"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
              <td valign="middle" style="padding-right:12px"><img src="${logoUrl}" alt="Laundry Express" width="48" height="48" style="display:block;border-radius:10px;border:1px solid #e2e8f0;background-color:#ffffff;padding:2px" /></td>
              <td valign="middle">
                <h1 style="font-size:19px;font-weight:900;color:#0f172a;margin:0;letter-spacing:-0.5px;line-height:1.1">LAUNDRY <span style="color:#be185d">EXPRESS</span></h1>
                <p style="color:#be185d;font-size:10px;font-weight:800;margin:3px 0 0;text-transform:uppercase;letter-spacing:0.8px">Premium 24-Hour Wash &amp; Fold</p>
                <p style="color:#64748b;font-size:11px;margin:2px 0 0">${escapeHtml(APP_CONFIG.supportPhone)}</p>
              </td>
            </tr></table></td>
            <td align="right" valign="middle">
              <span style="display:inline-block;background-color:${statusBg};border:1px solid ${statusBorder};color:${statusColor};font-size:11px;font-weight:800;padding:5px 12px;border-radius:9999px">✓ ${statusText}</span>
              <p style="margin:5px 0 0;color:#94a3b8;font-size:10px;font-family:monospace;font-weight:700">${inv.orderCancelled ? "CANCELLATION INVOICE" : "TAX INVOICE"} &bull; ${orderId}</p>
            </td>
          </tr></table>
        </td></tr>
        <tr><td bgcolor="#ffffff" class="light-card" style="padding:22px;background-color:#ffffff">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px"><tr>
            <td width="48%" valign="top" bgcolor="#f8fafc" class="sub-card" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px">
              <p style="font-size:10px;font-weight:800;color:#be185d;text-transform:uppercase;letter-spacing:1px;margin:0 0 5px">Billed To Customer</p>
              <p style="font-size:13px;font-weight:900;color:#0f172a;margin:0 0 3px">${customerName}</p>
              ${customerEmail ? `<p style="font-size:11px;color:#475569;margin:0 0 2px">${customerEmail}</p>` : ""}
              ${customerPhone ? `<p style="font-size:11px;color:#475569;margin:0 0 2px">Tel: ${customerPhone}</p>` : ""}
              ${address ? `<p style="font-size:11px;color:#475569;margin:4px 0 0;line-height:1.4">📍 ${address}</p>` : ""}
            </td>
            <td width="4%">&nbsp;</td>
            <td width="48%" valign="top" bgcolor="#f8fafc" class="sub-card" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px">
              <p style="font-size:10px;font-weight:800;color:#be185d;text-transform:uppercase;letter-spacing:1px;margin:0 0 5px">Schedule &amp; Reference</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:11px">
                <tr><td style="color:#64748b;padding:2px 0">Order Number:</td><td align="right" style="font-weight:800;color:#0f172a;font-family:monospace">${orderId}</td></tr>
                <tr><td style="color:#64748b;padding:2px 0">Order Placed:</td><td align="right" style="font-weight:700;color:#1e293b">${orderDate}</td></tr>
                <tr><td style="color:#64748b;padding:2px 0">Pickup Window:</td><td align="right" style="font-weight:700;color:#1e293b">${pickupDate} (${pickupSlot})</td></tr>
                <tr><td style="color:#64748b;padding:2px 0">Estimated Return:</td><td align="right" style="font-weight:700;color:#047857">${deliveryDate} (24hr Return)</td></tr>
                <tr><td style="color:#64748b;padding:2px 0">Stripe Tx ID:</td><td align="right" style="font-weight:700;color:#334155;font-family:monospace;font-size:10px">${txId}</td></tr>
              </table>
            </td>
          </tr></table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
            <tr bgcolor="#f8fafc"><td style="padding:9px 14px;font-size:10px;font-weight:800;color:#475569;text-transform:uppercase">Service Breakdown</td><td align="right" style="padding:9px 14px;font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase">Details</td></tr>
            <tr bgcolor="#ffffff" style="border-top:1px solid #f1f5f9"><td style="padding:10px 14px;color:#64748b;font-weight:600;font-size:12px">Selected Plan</td><td align="right" style="padding:10px 14px;font-weight:800;color:#0f172a;font-size:12px">${planName}</td></tr>
            <tr bgcolor="#ffffff" style="border-top:1px solid #f1f5f9"><td style="padding:10px 14px;color:#64748b;font-weight:600;font-size:12px">Order Intake Quantity</td><td align="right" style="padding:10px 14px;font-weight:700;color:#0f172a;font-size:12px">${quantity}</td></tr>
            <tr bgcolor="#ffffff" style="border-top:1px solid #f1f5f9"><td style="padding:10px 14px;color:#64748b;font-weight:600;font-size:12px">Formula &amp; Care</td><td align="right" style="padding:10px 14px;color:#0f172a;font-weight:600;font-size:12px">${detergentName} &bull; Cold Care (${detergentFee === 0 ? "Included Free" : formatCurrency(detergentFee)})</td></tr>
            <tr bgcolor="#ffffff" style="border-top:1px solid #f1f5f9"><td style="padding:10px 14px;color:#64748b;font-weight:600;font-size:12px">Doorstep Protocol</td><td align="right" style="padding:10px 14px;color:#0f172a;font-weight:600;font-size:12px">${specialRequest}</td></tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
            <tr bgcolor="#f8fafc"><td style="padding:9px 14px;font-size:10px;font-weight:800;color:#475569;text-transform:uppercase">Financial Settlement</td><td align="right" style="padding:9px 14px;font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase">Amount</td></tr>
            <tr bgcolor="#ffffff" style="border-top:1px solid #f1f5f9"><td style="padding:9px 14px;color:#64748b;font-size:12px">Service Subtotal</td><td align="right" style="padding:9px 14px;font-weight:700;color:#1e293b;font-size:12px">${formatCurrency(subtotal)}</td></tr>
            <tr bgcolor="#ffffff" style="border-top:1px solid #f1f5f9"><td style="padding:9px 14px;color:#64748b;font-size:12px">Detergent Formulation Fee</td><td align="right" style="padding:9px 14px;font-weight:700;color:${detergentFee === 0 ? "#047857" : "#1e293b"};font-size:12px">${detergentFee === 0 ? "FREE (Included)" : formatCurrency(detergentFee)}</td></tr>
            <tr bgcolor="#ffffff" style="border-top:1px solid #f1f5f9"><td style="padding:9px 14px;color:#64748b;font-size:12px">Doorstep Logistics (Pickup &amp; Return)</td><td align="right" style="padding:9px 14px;font-weight:700;color:${deliveryFee === 0 ? "#047857" : "#1e293b"};font-size:12px">${deliveryFee === 0 ? "FREE ($0.00)" : formatCurrency(deliveryFee)}</td></tr>
            ${discountAmount > 0 ? `<tr bgcolor="#ffffff" style="border-top:1px solid #f1f5f9"><td style="padding:9px 14px;color:#047857;font-weight:700;font-size:12px">Promotional Discount</td><td align="right" style="padding:9px 14px;font-weight:800;color:#047857;font-size:12px">-${formatCurrency(discountAmount)}</td></tr>` : ""}
            <tr bgcolor="#ffffff" style="border-top:1px solid #f1f5f9"><td style="padding:9px 14px;color:#64748b;font-size:12px">Payment Method</td><td align="right" style="padding:9px 14px;font-weight:700;color:#1e293b;font-size:12px">${paymentDisplay}</td></tr>
            <tr bgcolor="#ffffff" style="border-top:1px solid #f1f5f9"><td style="padding:9px 14px;color:#64748b;font-size:12px">Stripe Transaction ID</td><td align="right" style="padding:9px 14px;font-weight:700;color:#334155;font-family:monospace;font-size:10px">${txId}</td></tr>
            <tr bgcolor="#fdf2f8" style="border-top:1px solid #fbcfe8">
              <td style="padding:12px 14px"><span style="display:block;font-size:12px;font-weight:900;color:#0f172a">Total Cleared &amp; Authorized</span><span style="display:block;font-size:10px;color:#64748b">Captured securely via Stripe TLS 1.3 gateway</span></td>
              <td align="right" style="padding:12px 14px;font-size:20px;font-weight:900;color:#be185d">${formatCurrency(totalAmount)}</td>
            </tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f0fdf4" style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;margin-bottom:18px">
            <tr><td style="padding:10px 14px;font-size:11px;color:#14532d;line-height:1.4"><strong>100% Satisfaction Guarantee:</strong> Washed individually in eco-friendly cold water, dried gently, folded with care, and sealed for protected doorstep delivery.</td></tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e2e8f0;padding-top:14px">
            <tr><td align="center" style="font-size:11px;color:#64748b;padding-top:10px">
              Questions? Contact support at <strong style="color:#0f172a">${escapeHtml(APP_CONFIG.supportPhone)}</strong> or reply to <strong style="color:#0f172a">${escapeHtml(APP_CONFIG.supportEmail)}</strong>
              <p style="color:#94a3b8;font-size:10px;margin:5px 0 0">${inv.orderCancelled ? "Official Order Cancellation Receipt & Settlement" : "Official Computer-Generated Tax Invoice"} &middot; Laundry Express &middot; laundryexpressservices.com</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

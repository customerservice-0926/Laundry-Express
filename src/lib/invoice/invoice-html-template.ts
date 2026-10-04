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

  const isBrowser = typeof window !== "undefined";
  const logoUrl = isBrowser ? "/brand/logo-badge.jpg" : "cid:brand-logo-badge";

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:620px;width:100%;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06)">
      <!-- Top Brand Accent Bar -->
      <div style="height:6px;background:linear-gradient(90deg,#be185d 0%,#ec4899 100%)"></div>

      <!-- Brand Header -->
      <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:20px" cellpadding="20" cellspacing="0">
        <tr>
          <td style="vertical-align:middle">
            <table cellpadding="0" cellspacing="0" style="border-collapse:collapse">
              <tr>
                <td style="vertical-align:middle;padding-right:12px">
                  <img src="${logoUrl}" alt="Laundry Express" width="52" height="52" style="display:block;border-radius:12px;border:1px solid #e2e8f0;object-fit:contain;background:#ffffff;padding:2px" />
                </td>
                <td style="vertical-align:middle">
                  <h1 style="font-size:20px;font-weight:900;color:#0f172a;margin:0;letter-spacing:-0.5px;line-height:1.1">
                    LAUNDRY <span style="color:#be185d">EXPRESS</span>
                  </h1>
                  <p style="color:#be185d;font-size:11px;font-weight:700;margin:3px 0 0;text-transform:uppercase;letter-spacing:0.8px">
                    Premium 24-Hour Wash &amp; Fold
                  </p>
                  <p style="color:#64748b;font-size:11px;margin:2px 0 0">
                    ${escapeHtml(APP_CONFIG.supportPhone)}
                  </p>
                </td>
              </tr>
            </table>
          </td>
          <td style="text-align:right;vertical-align:middle">
            <span style="display:inline-block;background:${statusBg};border:1px solid ${statusBorder};color:${statusColor};font-size:11px;font-weight:800;padding:6px 14px;border-radius:9999px;letter-spacing:0.5px">
              ✓ ${statusText}
            </span>
            <p style="margin:6px 0 0;color:#94a3b8;font-size:10px;font-family:monospace;font-weight:700;text-transform:uppercase">
              TAX INVOICE &bull; ${orderId}
            </p>
          </td>
        </tr>
      </table>

      <div style="padding:24px">
        <!-- 2-Column Info Grid -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width:48%;vertical-align:top;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:16px">
              <p style="font-size:10px;font-weight:800;color:#be185d;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">Billed To Customer</p>
              <p style="font-size:13px;font-weight:900;color:#0f172a;margin:0 0 4px">${customerName}</p>
              ${customerEmail ? `<p style="font-size:11px;color:#475569;margin:0 0 2px">${customerEmail}</p>` : ""}
              ${customerPhone ? `<p style="font-size:11px;color:#475569;margin:0 0 2px">Tel: ${customerPhone}</p>` : ""}
              ${address ? `<p style="font-size:11px;color:#475569;margin:4px 0 0;line-height:1.4">📍 ${address}</p>` : ""}
            </td>
            <td style="width:4%"></td>
            <td style="width:48%;vertical-align:top;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:16px">
              <p style="font-size:10px;font-weight:800;color:#be185d;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">Schedule &amp; Reference</p>
              <table style="width:100%;font-size:11px;border-collapse:collapse">
                <tr><td style="color:#64748b;padding:2px 0">Order Number:</td><td style="text-align:right;font-weight:900;color:#0f172a;font-family:monospace">${orderId}</td></tr>
                <tr><td style="color:#64748b;padding:2px 0">Order Placed:</td><td style="text-align:right;font-weight:700;color:#1e293b">${orderDate}</td></tr>
                <tr><td style="color:#64748b;padding:2px 0">Pickup Window:</td><td style="text-align:right;font-weight:700;color:#1e293b">${pickupDate} (${pickupSlot})</td></tr>
                <tr><td style="color:#64748b;padding:2px 0">Estimated Return:</td><td style="text-align:right;font-weight:700;color:#047857">${deliveryDate} (24hr Return)</td></tr>
                <tr><td style="color:#64748b;padding:2px 0">Stripe Tx ID:</td><td style="text-align:right;font-weight:700;color:#334155;font-family:monospace;font-size:10px">${txId}</td></tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Service Breakdown Table -->
        <div style="border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;margin-bottom:20px">
          <table style="width:100%;background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:10px 16px" cellpadding="10" cellspacing="0">
            <tr>
              <td style="font-size:10px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:0.5px">Service Breakdown</td>
              <td style="text-align:right;font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase">Amount</td>
            </tr>
          </table>
          <table style="width:100%;font-size:12px;border-collapse:collapse" cellpadding="12" cellspacing="0">
            <tr style="border-bottom:1px solid #f1f5f9">
              <td style="color:#64748b;font-weight:600">Selected Plan</td>
              <td style="text-align:right;font-weight:900;color:#0f172a">${planName}</td>
            </tr>
            <tr style="border-bottom:1px solid #f1f5f9">
              <td style="color:#64748b;font-weight:600">Order Intake Quantity</td>
              <td style="text-align:right;font-weight:700;color:#0f172a">${quantity}</td>
            </tr>
            <tr style="border-bottom:1px solid #f1f5f9">
              <td style="color:#64748b;font-weight:600">Formula &amp; Care</td>
              <td style="text-align:right;color:#0f172a;font-weight:600">
                ${detergentName} &bull; Cold Water Care (${detergentFee === 0 ? "Included Free" : formatCurrency(detergentFee)})
              </td>
            </tr>
            <tr>
              <td style="color:#64748b;font-weight:600">Doorstep Protocol</td>
              <td style="text-align:right;color:#0f172a;font-weight:600">${specialRequest}</td>
            </tr>
          </table>
        </div>

        <!-- Financial Settlement Table -->
        <div style="border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;margin-bottom:20px">
          <table style="width:100%;background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:10px 16px" cellpadding="10" cellspacing="0">
            <tr>
              <td style="font-size:10px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:0.5px">Financial Settlement</td>
              <td style="text-align:right;font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase">Payment Summary</td>
            </tr>
          </table>
          <table style="width:100%;font-size:12px;border-collapse:collapse" cellpadding="10" cellspacing="0">
            <tr style="border-bottom:1px solid #f1f5f9">
              <td style="color:#64748b;font-weight:600">Service Subtotal</td>
              <td style="text-align:right;font-weight:700;color:#1e293b">${formatCurrency(subtotal)}</td>
            </tr>
            <tr style="border-bottom:1px solid #f1f5f9">
              <td style="color:#64748b;font-weight:600">Detergent Formulation Fee</td>
              <td style="text-align:right;font-weight:700;color:${detergentFee === 0 ? "#047857" : "#1e293b"}">
                ${detergentFee === 0 ? "FREE (Included)" : formatCurrency(detergentFee)}
              </td>
            </tr>
            <tr style="border-bottom:1px solid #f1f5f9">
              <td style="color:#64748b;font-weight:600">Doorstep Logistics (Pickup &amp; Return)</td>
              <td style="text-align:right;font-weight:700;color:${deliveryFee === 0 ? "#047857" : "#1e293b"}">
                ${deliveryFee === 0 ? "FREE ($0.00)" : formatCurrency(deliveryFee)}
              </td>
            </tr>
            ${discountAmount > 0 ? `
            <tr style="border-bottom:1px solid #f1f5f9">
              <td style="color:#047857;font-weight:700">Promotional Discount</td>
              <td style="text-align:right;font-weight:800;color:#047857">-${formatCurrency(discountAmount)}</td>
            </tr>` : ""}
            <tr style="border-bottom:1px solid #f1f5f9">
              <td style="color:#64748b;font-weight:600">Payment Method</td>
              <td style="text-align:right;font-weight:700;color:#1e293b">${paymentDisplay}</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0">
              <td style="color:#64748b;font-weight:600">Stripe Transaction ID</td>
              <td style="text-align:right;font-weight:700;color:#334155;font-family:monospace;font-size:10px">${txId}</td>
            </tr>
            <tr style="background:#fdf2f8">
              <td style="padding:14px 10px">
                <span style="display:block;font-size:13px;font-weight:900;color:#0f172a">Total Cleared &amp; Authorized</span>
                <span style="display:block;font-size:10px;color:#64748b">Captured securely via Stripe TLS 1.3 gateway</span>
              </td>
              <td style="text-align:right;padding:14px 10px;font-size:22px;font-weight:900;color:#be185d">
                ${formatCurrency(totalAmount)}
              </td>
            </tr>
          </table>
        </div>

        <!-- Satisfaction Guarantee Banner -->
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px 16px;margin-bottom:20px">
          <p style="margin:0;font-size:11px;color:#14532d;line-height:1.5">
            <strong>100% Satisfaction Guarantee:</strong> Washed individually in eco-conscious cold water, dried gently, folded with care, and sealed in weatherproof packaging for protected doorstep delivery.
          </p>
        </div>

        <!-- Footer -->
        <div style="border-top:1px solid #e2e8f0;padding-top:16px;text-align:center">
          <p style="color:#64748b;font-size:11px;margin:0 0 4px">
            Questions? Contact support at <strong>${escapeHtml(APP_CONFIG.supportPhone)}</strong> or reply to <strong>${escapeHtml(APP_CONFIG.supportEmail)}</strong>
          </p>
          <p style="color:#94a3b8;font-size:10px;margin:0">
            Official Computer-Generated Tax Invoice &middot; Laundry Express &middot; laundryexpressservices.com
          </p>
        </div>
      </div>
    </div>
  `;
}

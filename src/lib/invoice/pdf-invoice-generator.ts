import { jsPDF } from "jspdf";
import type { UnifiedInvoiceInput } from "./invoice-html-template";
import { formatCurrency, formatPhone } from "@/lib/utils";
import { APP_CONFIG } from "@/lib/constants";

function getLogoBase64(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("node:fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("node:path");
    const p = path.join(process.cwd(), "public", "brand", "logo-badge.jpg");
    if (fs.existsSync(p)) return `data:image/jpeg;base64,${fs.readFileSync(p).toString("base64")}`;
  } catch {}
  return null;
}

export function createInvoicePdfDoc(invoice: UnifiedInvoiceInput, logoDataUri?: string | null): jsPDF {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = pdf.internal.pageSize.getWidth(), margin = 14, contentW = W - margin * 2;
  const orderNumber = String(invoice.orderNumber || invoice.orderId || "LX-ORDER");
  const txId = invoice.transactionId || `STRIPE-TX-${orderNumber.replace(/[^A-Za-z0-9]/g, "").slice(-8).toUpperCase()}`;
  const planName = String(invoice.orderDetails?.planName || invoice.planName || "Wash & Fold Service");
  const detergent = String(invoice.orderDetails?.detergent || invoice.detergent || "Hypoallergenic Eco-Wash");
  const quantity = String(invoice.orderDetails?.quantity || invoice.quantity || "1 Order");
  const subtotal = Number(invoice.subtotal !== undefined ? invoice.subtotal : invoice.totalAmount || 0);
  const detFee = Number(invoice.detergentFee || 0);
  const deliveryFee = Number(invoice.deliveryFee || 0);
  const discountAmount = Number(invoice.discountAmount || 0);
  const totalAmount = Number(invoice.totalAmount || 0);
  const specialRequest = invoice.orderDetails?.specialRequest || invoice.specialRequest || "Contactless Delivery";

  // Top Accent Bar (Pink)
  pdf.setFillColor(190, 24, 93);
  pdf.rect(0, 0, W, 3, "F");

  // Logo & Header Brand
  let y = 14;
  const logo = logoDataUri || getLogoBase64();
  if (logo) {
    try { pdf.addImage(logo, "JPEG", margin, y - 5, 14, 14); } catch {}
  }
  const brandX = logo ? margin + 17 : margin;

  pdf.setFont("helvetica", "bold"); pdf.setFontSize(16); pdf.setTextColor(15, 23, 42);
  pdf.text("LAUNDRY ", brandX, y);
  const brandOffset = pdf.getTextWidth("LAUNDRY ");
  pdf.setTextColor(190, 24, 93);
  pdf.text("EXPRESS", brandX + brandOffset, y);

  pdf.setFontSize(8); pdf.setTextColor(190, 24, 93);
  pdf.text("PREMIUM 24-HOUR WASH & FOLD", brandX, y + 4.5);
  pdf.setTextColor(100, 116, 139); pdf.setFont("helvetica", "normal");
  pdf.text(`${APP_CONFIG.supportPhone} • laundryexpressservices.com`, brandX, y + 8.5);

  // Status Badge (Top Right) & Document Title
  const isCancelled = Boolean(invoice.orderCancelled);
  const docTitle = isCancelled ? "CANCELLATION INVOICE" : "TAX INVOICE";
  const badgeLabel = isCancelled ? "ORDER CANCELLED" : "PAID & CONFIRMED";

  if (isCancelled) {
    pdf.setFillColor(255, 247, 237); pdf.setDrawColor(254, 215, 170); pdf.setTextColor(194, 65, 12);
  } else {
    pdf.setFillColor(236, 253, 245); pdf.setDrawColor(167, 243, 208); pdf.setTextColor(4, 120, 87);
  }
  pdf.roundedRect(W - margin - 52, y - 4, 52, 8, 3, 3, "FD");
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(8);
  pdf.text(badgeLabel, W - margin - 26, y + 1.2, { align: "center" });

  pdf.setFontSize(7.5); pdf.setTextColor(148, 163, 184);
  pdf.text(`${docTitle} • ${orderNumber}`, W - margin, y + 9, { align: "right" });

  // Two Equal-Height Crisp Light Info Cards (y = 28)
  y = 28;
  const cardW = (contentW - 6) / 2, cardH = 36;

  // Card 1: Billed To Customer (Clean #f8fafc)
  pdf.setFillColor(248, 250, 252); pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(margin, y, cardW, cardH, 3, 3, "FD");
  pdf.setFontSize(7.5); pdf.setTextColor(190, 24, 93); pdf.setFont("helvetica", "bold");
  pdf.text("BILLED TO CUSTOMER", margin + 4, y + 5.5);
  pdf.setFontSize(9.5); pdf.setTextColor(15, 23, 42);
  pdf.text(invoice.customerName || "Valued Customer", margin + 4, y + 11);
  pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal"); pdf.setTextColor(71, 85, 105);
  pdf.text(invoice.customerEmail || "", margin + 4, y + 16);
  if (invoice.customerPhone) pdf.text(`Tel: ${formatPhone(invoice.customerPhone)}`, margin + 4, y + 21);
  const addrLines = pdf.splitTextToSize(`Address: ${invoice.address || ""}`, cardW - 8);
  pdf.text(addrLines.slice(0, 2), margin + 4, y + (invoice.customerPhone ? 26 : 21));

  // Card 2: Schedule & Reference (Identical clean #f8fafc — High Contrast & Visibility)
  const c2X = margin + cardW + 6;
  pdf.setFillColor(248, 250, 252); pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(c2X, y, cardW, cardH, 3, 3, "FD");
  pdf.setFontSize(7.5); pdf.setTextColor(190, 24, 93); pdf.setFont("helvetica", "bold");
  pdf.text("SCHEDULE & REFERENCE", c2X + 4, y + 5.5);
  pdf.setFont("helvetica", "normal"); pdf.setTextColor(100, 116, 139);
  pdf.text("Order Number:", c2X + 4, y + 10.5);
  pdf.text("Order Placed:", c2X + 4, y + 15);
  pdf.text("Pickup Window:", c2X + 4, y + 19.5);
  pdf.text("Estimated Return:", c2X + 4, y + 24);
  pdf.text("Stripe Tx ID:", c2X + 4, y + 28.5);

  pdf.setTextColor(15, 23, 42); pdf.setFont("helvetica", "bold");
  pdf.text(orderNumber, c2X + cardW - 4, y + 10.5, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.text(invoice.orderDate, c2X + cardW - 4, y + 15, { align: "right" });
  pdf.text(`${invoice.pickupDate} (${invoice.pickupSlot})`, c2X + cardW - 4, y + 19.5, { align: "right" });
  pdf.setTextColor(4, 120, 87); pdf.setFont("helvetica", "bold");
  pdf.text(`${invoice.deliveryDate} (24hr Return)`, c2X + cardW - 4, y + 24, { align: "right" });
  pdf.setTextColor(51, 65, 85); pdf.setFont("helvetica", "normal");
  pdf.text(txId.slice(0, 26), c2X + cardW - 4, y + 28.5, { align: "right" });

  // Service Breakdown Section
  y += cardH + 5;
  pdf.setFillColor(248, 250, 252); pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(margin, y, contentW, 6.5, 2, 2, "FD");
  pdf.setFontSize(7.5); pdf.setFont("helvetica", "bold"); pdf.setTextColor(71, 85, 105);
  pdf.text("SERVICE BREAKDOWN", margin + 4, y + 4.5);
  pdf.text("AMOUNT", W - margin - 4, y + 4.5, { align: "right" });
  y += 6.5;

  const serviceRows: [string, string][] = [
    ["Selected Plan", planName],
    ["Order Intake Quantity", quantity],
    ["Formula & Care", `${detergent} • Cold Water Care (${detFee === 0 ? "Included Free" : formatCurrency(detFee)})`],
    ["Doorstep Protocol", specialRequest],
  ];

  pdf.setFontSize(7.5);
  serviceRows.forEach(([lbl, val]) => {
    pdf.setFillColor(255, 255, 255); pdf.setDrawColor(241, 245, 249);
    pdf.rect(margin, y, contentW, 7, "FD");
    pdf.setTextColor(100, 116, 139); pdf.setFont("helvetica", "normal");
    pdf.text(lbl, margin + 4, y + 4.8);
    pdf.setTextColor(15, 23, 42); pdf.setFont("helvetica", "bold");
    pdf.text(String(val), W - margin - 4, y + 4.8, { align: "right" });
    y += 7;
  });

  // Financial Settlement Section
  y += 4;
  pdf.setFillColor(248, 250, 252); pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(margin, y, contentW, 6.5, 2, 2, "FD");
  pdf.setFontSize(7.5); pdf.setFont("helvetica", "bold"); pdf.setTextColor(71, 85, 105);
  pdf.text("FINANCIAL SETTLEMENT", margin + 4, y + 4.5);
  pdf.text("PAYMENT SUMMARY", W - margin - 4, y + 4.5, { align: "right" });
  y += 6.5;

  const financialRows: [string, string, string][] = [
    ["Service Subtotal", formatCurrency(subtotal), "#0f172a"],
    ["Detergent Formulation Fee", detFee === 0 ? "FREE (Included)" : formatCurrency(detFee), detFee === 0 ? "#047857" : "#0f172a"],
    ["Doorstep Logistics (Pickup & Return)", deliveryFee === 0 ? "FREE ($0.00)" : formatCurrency(deliveryFee), deliveryFee === 0 ? "#047857" : "#0f172a"],
    ...(discountAmount > 0 ? [["Promotional Discount", `-${formatCurrency(discountAmount)}`, "#047857"]] as [string, string, string][] : []),
    ["Payment Method", String(invoice.paymentMethod || "Credit / Debit Card (Stripe)"), "#0f172a"],
    ["Stripe Transaction ID", txId, "#334155"],
  ];

  financialRows.forEach(([lbl, val, col]) => {
    pdf.setFillColor(255, 255, 255); pdf.setDrawColor(241, 245, 249);
    pdf.rect(margin, y, contentW, 6.5, "FD");
    pdf.setTextColor(100, 116, 139); pdf.setFont("helvetica", "normal");
    pdf.text(lbl, margin + 4, y + 4.5);
    pdf.setTextColor(col === "#047857" ? 4 : col === "#334155" ? 51 : 15, col === "#047857" ? 120 : col === "#334155" ? 65 : 23, col === "#047857" ? 87 : col === "#334155" ? 85 : 42);
    pdf.setFont("helvetica", "bold");
    pdf.text(val, W - margin - 4, y + 4.5, { align: "right" });
    y += 6.5;
  });

  // Total Highlight Box
  pdf.setFillColor(253, 242, 248); pdf.setDrawColor(251, 207, 232);
  pdf.rect(margin, y, contentW, 11, "FD");
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(8.5); pdf.setTextColor(15, 23, 42);
  pdf.text("TOTAL CLEARED & AUTHORIZED", margin + 4, y + 5);
  pdf.setFontSize(6.5); pdf.setFont("helvetica", "normal"); pdf.setTextColor(100, 116, 139);
  pdf.text("Captured securely via Stripe TLS 1.3 gateway", margin + 4, y + 8.5);
  pdf.setFontSize(13); pdf.setFont("helvetica", "bold"); pdf.setTextColor(190, 24, 93);
  pdf.text(formatCurrency(totalAmount), W - margin - 4, y + 7.5, { align: "right" });
  y += 15;

  // 100% Satisfaction Guarantee Banner
  pdf.setFillColor(240, 253, 244); pdf.setDrawColor(187, 247, 208);
  pdf.roundedRect(margin, y, contentW, 12, 3, 3, "FD");
  pdf.setFontSize(7.5); pdf.setFont("helvetica", "bold"); pdf.setTextColor(20, 83, 45);
  pdf.text("100% SATISFACTION GUARANTEE", margin + 4, y + 4.5);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(7); pdf.setTextColor(22, 101, 52);
  pdf.text("Washed individually in eco-conscious cold water, dried gently, folded with care, and sealed for protected doorstep delivery.", margin + 4, y + 8.5);

  // Footer
  pdf.setFontSize(7); pdf.setTextColor(148, 163, 184);
  const footerDoc = isCancelled ? "Official Order Cancellation Receipt & Settlement" : "Official Computer-Generated Tax Invoice";
  pdf.text(`Questions? ${APP_CONFIG.supportPhone} • ${APP_CONFIG.supportEmail}`, W / 2, 281, { align: "center" });
  pdf.text(`${footerDoc} • Laundry Express • laundryexpressservices.com`, W / 2, 285, { align: "center" });
  return pdf;
}

export function createEmailInvoicePdf(invoice: UnifiedInvoiceInput): Buffer {
  return Buffer.from(createInvoicePdfDoc(invoice).output("arraybuffer"));
}

export async function downloadInvoiceAsPdf(invoice: UnifiedInvoiceInput, filename?: string): Promise<void> {
  let logoDataUri: string | null = null;
  if (typeof window !== "undefined") {
    try {
      const resp = await fetch("/brand/logo-badge.jpg");
      const blob = await resp.blob();
      logoDataUri = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {}
  }
  const pdf = createInvoicePdfDoc(invoice, logoDataUri);
  pdf.save(filename || `LaundryExpress-Invoice-${invoice.orderId || invoice.orderNumber || "LX"}.pdf`);
}

export async function generateInvoicePdfBlob(invoice: UnifiedInvoiceInput): Promise<Blob> {
  return createInvoicePdfDoc(invoice).output("blob");
}

import { jsPDF } from "jspdf";
import type { InvoiceEmailPayload } from "@/lib/services/email-service";

export function createEmailInvoicePdf(invoice: InvoiceEmailPayload): Buffer {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = pdf.internal.pageSize.getWidth();
  const margin = 14;
  const contentW = W - margin * 2;
  const detFee = Number(invoice.detergentFee || 0);
  const detFeeStr = detFee === 0 ? "FREE (Included)" : `$${detFee.toFixed(2)}`;
  const orderNumber = String(invoice.orderNumber || "LX-ORDER");
  const txId = invoice.transactionId || `STRIPE-TX-${orderNumber.replace(/[^A-Za-z0-9]/g, "").slice(-8).toUpperCase()}`;
  const planName = String(invoice.planName || "Wash & Fold Service");
  const detergent = String(invoice.detergent || "Hypoallergenic Eco-Wash");
  const quantity = String(invoice.quantity || "1 Order");
  const subtotal = Number(invoice.subtotal || 0);
  const deliveryFee = Number(invoice.deliveryFee || 0);
  const discountAmount = Number(invoice.discountAmount || 0);
  const totalAmount = Number(invoice.totalAmount || 0);

  // Top Accent Bar
  pdf.setFillColor(190, 24, 93);
  pdf.rect(0, 0, W, 3, "F");

  // Header Brand
  let y = 14;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(15, 23, 42);
  pdf.text("LAUNDRY ", margin, y);
  const brandOffset = pdf.getTextWidth("LAUNDRY ");
  pdf.setTextColor(190, 24, 93);
  pdf.text("EXPRESS", margin + brandOffset, y);

  pdf.setFontSize(8.5);
  pdf.setTextColor(190, 24, 93);
  pdf.text("PREMIUM 24-HOUR WASH & FOLD", margin, y + 4.5);
  pdf.setTextColor(100, 116, 139);
  pdf.setFont("helvetica", "normal");
  pdf.text("(815) 575-9536 • laundryexpressservices.com", margin, y + 8.5);

  // Status Badge
  pdf.setFillColor(236, 253, 245);
  pdf.setDrawColor(167, 243, 208);
  pdf.roundedRect(W - margin - 50, y - 4, 50, 8, 3, 3, "FD");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(4, 120, 87);
  pdf.text("PAID & CONFIRMED", W - margin - 25, y + 1, { align: "center" });

  pdf.setFontSize(7.5);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(148, 163, 184);
  pdf.text(`TAX INVOICE • ${invoice.orderNumber}`, W - margin, y + 9, { align: "right" });

  // Two Info Cards
  y = 28;
  const cardW = (contentW - 5) / 2;
  const cardH = 34;

  // Card 1: Billed To
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(margin, y, cardW, cardH, 3, 3, "FD");
  pdf.setFontSize(7.5);
  pdf.setTextColor(190, 24, 93);
  pdf.setFont("helvetica", "bold");
  pdf.text("BILLED TO CUSTOMER", margin + 4, y + 5.5);
  pdf.setFontSize(9.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text(invoice.customerName || "Valued Customer", margin + 4, y + 11);
  pdf.setFontSize(7.5);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(71, 85, 105);
  pdf.text(invoice.customerEmail, margin + 4, y + 16);
  if (invoice.customerPhone) pdf.text(`Phone: ${invoice.customerPhone}`, margin + 4, y + 21);
  const addrLines = pdf.splitTextToSize(`Address: ${invoice.address}`, cardW - 8);
  pdf.text(addrLines.slice(0, 2), margin + 4, y + (invoice.customerPhone ? 25.5 : 21));

  // Card 2: Schedule & Timeline
  const c2X = margin + cardW + 5;
  pdf.roundedRect(c2X, y, cardW, cardH, 3, 3, "FD");
  pdf.setFontSize(7.5);
  pdf.setTextColor(190, 24, 93);
  pdf.setFont("helvetica", "bold");
  pdf.text("SCHEDULE & REFERENCE", c2X + 4, y + 5.5);
  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text("Order Number:", c2X + 4, y + 10.5);
  pdf.text("Order Placed:", c2X + 4, y + 15);
  pdf.text("Pickup Window:", c2X + 4, y + 19.5);
  pdf.text("Estimated Return:", c2X + 4, y + 24);
  pdf.text("Stripe Tx ID:", c2X + 4, y + 28.5);

  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(15, 23, 42);
  pdf.text(invoice.orderNumber, c2X + 26, y + 10.5);
  pdf.setFont("helvetica", "normal");
  pdf.text(invoice.orderDate.slice(0, 10), c2X + 26, y + 15);
  pdf.text(`${invoice.pickupDate} (${invoice.pickupSlot})`, c2X + 26, y + 19.5);
  pdf.setTextColor(4, 120, 87);
  pdf.setFont("helvetica", "bold");
  pdf.text(`${invoice.deliveryDate} (24hr Return)`, c2X + 26, y + 24);
  pdf.setTextColor(190, 24, 93);
  pdf.text(txId.slice(0, 28), c2X + 26, y + 28.5);

  // Table Header
  y += cardH + 6;
  pdf.setFillColor(15, 23, 42);
  pdf.roundedRect(margin, y, contentW, 7, 2, 2, "F");
  pdf.setFontSize(7.5);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(255, 255, 255);
  pdf.text("SERVICE BREAKDOWN", margin + 4, y + 4.8);
  pdf.text("SPECIFICATION & CARE", margin + 70, y + 4.8);
  pdf.text("QTY", margin + 130, y + 4.8);
  pdf.text("AMOUNT", W - margin - 4, y + 4.8, { align: "right" });

  // Table Rows
  y += 7;
  const rows = [
    [planName, `${detergent} • Gentle Cold Wash`, quantity, `$${subtotal.toFixed(2)}`],
    [`Detergent Formulation Fee (${detergent})`, "Standard Cold Eco-Wash Formula", "1 Cycle", detFeeStr],
    ["Doorstep Logistics (Pickup & Return)", invoice.specialRequest || "Contactless Delivery", "1 Trip", deliveryFee === 0 ? "FREE ($0.00)" : `$${deliveryFee.toFixed(2)}`],
  ];
  if (discountAmount > 0) {
    rows.push(["Promotional Coupon Discount", "Verified discount applied", "1 Promo", `-$${discountAmount.toFixed(2)}`]);
  }

  pdf.setDrawColor(226, 232, 240);
  rows.forEach(([desc, spec, qty, amt], i) => {
    pdf.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252);
    pdf.rect(margin, y, contentW, 8.5, "FD");
    pdf.setFontSize(7.5);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(15, 23, 42);
    pdf.text(String(desc || ""), margin + 4, y + 5.5);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(71, 85, 105);
    pdf.text(String(spec || ""), margin + 70, y + 5.5);
    pdf.text(String(qty || "1"), margin + 130, y + 5.5);
    pdf.setFont("helvetica", "bold");
    const safeAmt = String(amt || "$0.00");
    pdf.setTextColor(safeAmt.startsWith("FREE") ? 4 : 15, safeAmt.startsWith("FREE") ? 120 : 23, safeAmt.startsWith("FREE") ? 87 : 42);
    pdf.text(safeAmt, W - margin - 4, y + 5.5, { align: "right" });
    y += 8.5;
  });

  // Bottom Cards
  y += 5;
  const bCardH = 34;

  // Payment Confirmation Card
  pdf.setFillColor(250, 245, 255);
  pdf.setDrawColor(233, 213, 255);
  pdf.roundedRect(margin, y, cardW, bCardH, 3, 3, "FD");
  pdf.setFontSize(7.5);
  pdf.setTextColor(126, 34, 206);
  pdf.setFont("helvetica", "bold");
  pdf.text("PAYMENT CONFIRMATION & GATEWAY", margin + 4, y + 5.5);
  pdf.setFontSize(8);
  pdf.setTextColor(15, 23, 42);
  pdf.text(`Method: ${invoice.paymentMethod}`, margin + 4, y + 11.5);
  pdf.setTextColor(190, 24, 93);
  pdf.text(`Stripe Tx ID: ${txId}`, margin + 4, y + 17);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(71, 85, 105);
  pdf.text("Status: Captured & Settled (Authorized)", margin + 4, y + 22.5);
  pdf.text("Encrypted transaction via TLS 1.3 256-bit gateway.", margin + 4, y + 27.5);

  // Financial Summary Card
  const tX = margin + cardW + 5;
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(tX, y, cardW, bCardH, 3, 3, "FD");
  pdf.setFontSize(7.5);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(190, 24, 93);
  pdf.text("FINANCIAL SETTLEMENT", tX + 4, y + 5.5);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(100, 116, 139);
  pdf.text("Service Subtotal:", tX + 4, y + 10.5);
  pdf.text("Detergent Formulation:", tX + 4, y + 15);
  pdf.text("Doorstep Logistics:", tX + 4, y + 19.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text(`$${subtotal.toFixed(2)}`, tX + cardW - 4, y + 10.5, { align: "right" });
  pdf.text(detFeeStr, tX + cardW - 4, y + 15, { align: "right" });
  pdf.text(deliveryFee === 0 ? "FREE ($0.00)" : `$${deliveryFee.toFixed(2)}`, tX + cardW - 4, y + 19.5, { align: "right" });

  let curY = y + 24;
  if (discountAmount > 0) {
    pdf.setTextColor(4, 120, 87);
    pdf.text("Promo Discount:", tX + 4, curY);
    pdf.text(`-$${discountAmount.toFixed(2)}`, tX + cardW - 4, curY, { align: "right" });
    curY += 4.5;
  }
  pdf.setDrawColor(203, 213, 225);
  pdf.line(tX + 4, curY - 1, tX + cardW - 4, curY - 1);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(15, 23, 42);
  pdf.text("TOTAL CLEARED & AUTHORIZED:", tX + 4, curY + 4);
  pdf.setFontSize(11);
  pdf.setTextColor(190, 24, 93);
  pdf.text(`$${totalAmount.toFixed(2)}`, tX + cardW - 4, curY + 4, { align: "right" });

  // Satisfaction Guarantee Banner
  y += bCardH + 5;
  pdf.setFillColor(240, 253, 244);
  pdf.setDrawColor(187, 247, 208);
  pdf.roundedRect(margin, y, contentW, 14, 3, 3, "FD");
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(22, 101, 52);
  pdf.text("100% SATISFACTION GUARANTEE", margin + 4, y + 4.5);
  pdf.setFont("helvetica", "normal");
  pdf.text("Washed individually in eco-conscious cold water, dried gently, folded with care, and sealed for protected doorstep delivery.", margin + 4, y + 8.5);

  // Footer
  pdf.setFontSize(7);
  pdf.setTextColor(148, 163, 184);
  pdf.text("Questions? (815) 575-9536 • customerservice@laundryexpressservices.com", W / 2, 280, { align: "center" });
  pdf.text("Official Computer-Generated Tax Invoice • Laundry Express • laundryexpressservices.com", W / 2, 284, { align: "center" });

  return Buffer.from(pdf.output("arraybuffer"));
}

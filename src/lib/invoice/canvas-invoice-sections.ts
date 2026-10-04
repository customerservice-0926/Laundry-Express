"use client";

import type { InvoiceData } from "@/components/booking/order-invoice-modal";
import { drawRoundRect } from "./canvas-helpers";
import { APP_CONFIG } from "@/lib/constants";
import { formatPhone } from "@/lib/utils";

export function drawPortraitHeader(
  ctx: CanvasRenderingContext2D,
  W: number,
  logo: HTMLImageElement | null
) {
  // Top brand gradient banner
  const grad = ctx.createLinearGradient(40, 32, W - 40, 32);
  grad.addColorStop(0, "#BE185D");
  grad.addColorStop(0.5, "#DB2777");
  grad.addColorStop(1, "#EC4899");
  ctx.fillStyle = grad;
  drawRoundRect(ctx, 40, 30, W - 80, 10, 5);
  ctx.fill();

  // Proportional 1:1 Logo Badge (Never squished or cropped)
  const logoBoxX = 50;
  const logoBoxY = 56;
  const logoBoxSize = 78;

  // Outer logo card
  drawRoundRect(ctx, logoBoxX, logoBoxY, logoBoxSize, logoBoxSize, 16);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (logo) {
    ctx.save();
    // Inner clipped image area with true 1:1 aspect ratio
    drawRoundRect(ctx, logoBoxX + 4, logoBoxY + 4, logoBoxSize - 8, logoBoxSize - 8, 12);
    ctx.clip();
    const naturalRatio = (logo.naturalWidth || 1) / (logo.naturalHeight || 1);
    const innerSize = logoBoxSize - 8;
    let drawW = innerSize;
    let drawH = innerSize;
    let drawX = logoBoxX + 4;
    let drawY = logoBoxY + 4;

    if (naturalRatio > 1) {
      drawH = innerSize / naturalRatio;
      drawY = logoBoxY + 4 + (innerSize - drawH) / 2;
    } else if (naturalRatio < 1) {
      drawW = innerSize * naturalRatio;
      drawX = logoBoxX + 4 + (innerSize - drawW) / 2;
    }

    ctx.drawImage(logo, drawX, drawY, drawW, drawH);
    ctx.restore();
  }

  // Brand Name & Tagline alongside logo
  const textX = logoBoxX + logoBoxSize + 18;

  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 28px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("LAUNDRY EXPRESS", textX, 86);

  ctx.fillStyle = "#BE185D";
  ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("PREMIUM 24-HOUR WASH & FOLD SERVICE", textX, 107);

  ctx.fillStyle = "#64748B";
  ctx.font = "normal 11px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("Professional Doorstep Pickup & Delivery • 24hr Turnaround", textX, 125);

  // Official Company Contact Info on the right
  ctx.textAlign = "right";
  ctx.fillStyle = "#334155";
  ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText(APP_CONFIG.name, W - 50, 78);

  ctx.fillStyle = "#64748B";
  ctx.font = "normal 11px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText(`Phone: ${APP_CONFIG.supportPhone} • ${APP_CONFIG.supportEmail}`, W - 50, 98);
  ctx.fillText("Official Portal: www.laundryexpressservices.com", W - 50, 118);
  ctx.textAlign = "left";

  // Dividing rule
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(50, 150);
  ctx.lineTo(W - 50, 150);
  ctx.stroke();
}

export function drawPortraitMetaAndCards(
  ctx: CanvasRenderingContext2D,
  W: number,
  inv: InvoiceData
) {
  // Title & Reference
  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("TAX INVOICE & OFFICIAL RECEIPT", 50, 190);

  ctx.fillStyle = "#64748B";
  ctx.font = "normal 12px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("Verified Customer Booking & Transaction Statement", 50, 211);

  // Paid Status Pill Badge
  const pW = 195;
  const pX = W - 50 - pW;
  ctx.fillStyle = "#ECFDF5";
  drawRoundRect(ctx, pX, 172, pW, 36, 18);
  ctx.fill();
  ctx.strokeStyle = "#A7F3D0";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#047857";
  ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("✔ PAID & CONFIRMED (STRIPE)", pX + pW / 2, 195);
  ctx.textAlign = "left";

  // Information Cards (Billed To & Schedule Timeline)
  const cardW = (W - 100 - 24) / 2;
  const cardY = 232;
  const cardH = 152;

  // 1. Billed To Card
  drawRoundRect(ctx, 50, cardY, cardW, cardH, 14);
  ctx.fillStyle = "#F8FAFC";
  ctx.fill();
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = "#BE185D";
  ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("BILLED TO CUSTOMER", 70, cardY + 28);

  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 15px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText(inv.customerName || "Valued Customer", 70, cardY + 54);

  ctx.fillStyle = "#475569";
  ctx.font = "normal 12px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText(inv.customerEmail || "N/A", 70, cardY + 76);

  if (inv.customerPhone) {
    ctx.fillText(`Phone: ${formatPhone(inv.customerPhone)}`, 70, cardY + 96);
  }

  const addr = inv.address || "Doorstep Address";
  const displayAddr = addr.length > 52 ? addr.slice(0, 49) + "..." : addr;
  ctx.fillStyle = "#1E293B";
  ctx.fillText(`Address: ${displayAddr}`, 70, cardY + (inv.customerPhone ? 120 : 104));

  // 2. Schedule & Order Details Card
  const c2X = 50 + cardW + 24;
  drawRoundRect(ctx, c2X, cardY, cardW, cardH, 14);
  ctx.fillStyle = "#F8FAFC";
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#BE185D";
  ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("SCHEDULE & REFERENCE", c2X + 20, cardY + 28);

  const metaRows = [
    ["Order Number:", inv.orderId],
    ["Order Date:", inv.orderDate],
    ["Pickup Window:", `${inv.pickupDate} (${inv.pickupSlot})`],
    ["Estimated Return:", `${inv.deliveryDate} (24hr Return)`],
    ["Doorstep Protocol:", inv.orderDetails.specialRequest || "Contactless Delivery"],
  ];

  metaRows.forEach(([label, val], idx) => {
    const rY = cardY + 52 + idx * 20;
    ctx.fillStyle = "#64748B";
    ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(label, c2X + 20, rY);

    ctx.fillStyle = "#0F172A";
    ctx.font = idx === 0 ? "bold 12px -apple-system, monospace, sans-serif" : "normal 11px -apple-system, sans-serif";
    ctx.fillText(val.length > 36 ? val.slice(0, 34) + "..." : val, c2X + 135, rY);
  });
}

import crypto from "crypto";
import { getAuthSecret } from "@/lib/auth-secret";

export interface VerifiedReviewToken {
  valid: boolean;
  orderNumber?: string;
  orderId?: string;
  email?: string;
}

/**
 * Generates a tamper-proof HMAC session token for direct order review submission.
 * Allows customers to review completed orders from their email without login.
 */
export function generateReviewToken(orderNumber: string, orderId: string, email: string): string {
  const secret = getAuthSecret();
  const payload = `${orderNumber.trim()}:${orderId.trim()}:${(email || "").trim().toLowerCase()}:${Date.now()}`;
  const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const dataB64 = Buffer.from(payload, "utf-8").toString("base64url");
  return `${dataB64}.${hmac}`;
}

/**
 * Validates the HMAC signature and timestamp (valid for 60 days).
 */
export function verifyReviewToken(token?: string | null): VerifiedReviewToken {
  if (!token || typeof token !== "string") return { valid: false };
  try {
    const parts = token.trim().split(".");
    if (parts.length !== 2) return { valid: false };
    const [dataB64, hmac] = parts;
    const payload = Buffer.from(dataB64, "base64url").toString("utf-8");
    const secret = getAuthSecret();
    const expectedHmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");

    const hmacBuf = Buffer.from(hmac, "hex");
    const expectedBuf = Buffer.from(expectedHmac, "hex");
    if (hmacBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(hmacBuf, expectedBuf)) {
      return { valid: false };
    }

    const [orderNumber, orderId, email, tsStr] = payload.split(":");
    const ts = Number(tsStr);
    // 60-day expiration window
    if (!orderNumber || isNaN(ts) || Date.now() - ts > 60 * 24 * 60 * 60 * 1000) {
      return { valid: false };
    }

    return { valid: true, orderNumber, orderId, email };
  } catch {
    return { valid: false };
  }
}

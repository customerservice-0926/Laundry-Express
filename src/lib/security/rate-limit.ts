import crypto from "node:crypto";
import { getAuthSecret } from "@/lib/auth-secret";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

interface RequestLike {
  headers?: Headers | Record<string, string | string[] | undefined> | { get?: (name: string) => string | null };
}

function extractClientIp(req?: RequestLike): string {
  if (!req?.headers) return "unknown";
  const h = req.headers;
  const getHeader = (name: string): string | null => {
    if (typeof (h as Headers).get === "function") return (h as Headers).get(name);
    if (typeof (h as { get?: (k: string) => string | null }).get === "function") {
      return (h as { get: (k: string) => string | null }).get(name);
    }
    const val = (h as Record<string, string | string[] | undefined>)[name]
      || (h as Record<string, string | string[] | undefined>)[name.toLowerCase()];
    return Array.isArray(val) ? val[0] : (val || null);
  };

  const ip = getHeader("x-vercel-forwarded-for")
    || getHeader("x-real-ip")
    || "unknown";
  return ip.replace(/[^a-zA-Z0-9.:_-]/g, "");
}

const memLimits = new Map<string, { count: number; resetAt: number }>();

function checkMemLimit(key: string, limit: number, windowSeconds: number): boolean {
  const now = Date.now();
  const entry = memLimits.get(key);
  if (!entry || now > entry.resetAt) {
    memLimits.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

export async function consumeRateLimit(
  req: RequestLike | undefined,
  scope: string,
  limit: number,
  windowSeconds: number,
  subject = ""
): Promise<boolean> {
  const ip = extractClientIp(req);
  const secret = getAuthSecret();
  const supabase = createAdminSupabaseClient();

  // 1. IP-based rate limit check
  const ipKey = crypto.createHmac("sha256", secret).update(`${scope}:ip:${ip}`).digest("hex");
  try {
    const { data: ipAllowed, error: ipError } = await supabase.rpc("consume_auth_rate_limit", {
      key_input: ipKey,
      max_hits: limit,
      window_seconds: windowSeconds,
    });
    if (ipError) {
      console.warn(`[rate-limit] RPC unavailable (${ipError.message}), using memory fallback.`);
      if (!checkMemLimit(ipKey, limit, windowSeconds)) return false;
    } else if (ipAllowed !== true) {
      return false;
    }
  } catch {
    if (!checkMemLimit(ipKey, limit, windowSeconds)) return false;
  }

  // 2. Account/Email subject rate limit check
  const normSubject = subject.trim().toLowerCase();
  if (normSubject) {
    const accKey = crypto.createHmac("sha256", secret).update(`${scope}:account:${normSubject}`).digest("hex");
    try {
      const { data: accAllowed, error: accError } = await supabase.rpc("consume_auth_rate_limit", {
        key_input: accKey,
        max_hits: limit,
        window_seconds: windowSeconds,
      });
      if (accError) {
        if (!checkMemLimit(accKey, limit, windowSeconds)) return false;
      } else if (accAllowed !== true) {
        return false;
      }
    } catch {
      if (!checkMemLimit(accKey, limit, windowSeconds)) return false;
    }
  }

  return true;
}

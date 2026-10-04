import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export interface CouponItem {
  id: string;
  code: string;
  title: string;
  discount_type: "percentage" | "fixed_amount" | "free_delivery";
  discount_value: number;
  min_order_amount: number;
  max_uses?: number;
  used_count?: number;
  expires_at?: string;
  is_active: boolean;
}

const isUuid = (val?: string): boolean =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

export class CouponService {
  static async getCoupons(): Promise<CouponItem[]> {
    try {
      const supabase = createAdminSupabaseClient();
      const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
      if (error || !data) return [];
      return data.map((item) => ({
        id: item.id,
        code: item.code,
        title: item.title || "",
        discount_type: item.discount_type,
        discount_value: Number(item.discount_value ?? 0),
        min_order_amount: Number(item.min_order_amount ?? 0),
        max_uses: item.max_uses == null ? undefined : Number(item.max_uses),
        used_count: Number(item.used_count ?? 0),
        expires_at: item.expires_at || undefined,
        is_active: item.is_active ?? true,
      }));
    } catch {
      return [];
    }
  }

  static async validateCoupon(code: string, subtotal: number): Promise<{ valid: boolean; coupon?: CouponItem; error?: string }> {
    const list = await this.getCoupons();
    const cleanCode = code.trim().toUpperCase();
    const found = list.find((c) => c.code.toUpperCase() === cleanCode);

    if (!found) return { valid: false, error: "Invalid coupon code." };
    if (!found.is_active) return { valid: false, error: "This coupon is no longer active." };
    if (found.max_uses != null && (found.used_count || 0) >= found.max_uses) {
      return { valid: false, error: "This coupon has reached its usage limit." };
    }
    if (found.expires_at && new Date(found.expires_at).getTime() < Date.now()) {
      return { valid: false, error: "This promo code has expired." };
    }
    if (subtotal < found.min_order_amount) {
      return { valid: false, error: `Minimum order of $${found.min_order_amount.toFixed(2)} required for this code.` };
    }

    return { valid: true, coupon: found };
  }

  static async saveCoupon(coupon: Partial<CouponItem>): Promise<CouponItem> {
    const code = coupon.code?.trim().toUpperCase() ?? "";
    const title = coupon.title?.trim() ?? "";
    const discount_type = coupon.discount_type;
    const discount_value = Number(coupon.discount_value);
    const min_order_amount = Number(coupon.min_order_amount ?? 0);
    const max_uses = coupon.max_uses == null ? undefined : Number(coupon.max_uses);
    const expires_at = coupon.expires_at || undefined;
    const is_active = coupon.is_active ?? true;
    if (!code || !title || !discount_type || !Number.isFinite(discount_value) || discount_value <= 0 ||
      !Number.isFinite(min_order_amount) || min_order_amount < 0 ||
      (max_uses !== undefined && (!Number.isInteger(max_uses) || max_uses <= 0))) {
      throw new Error("Enter a code, title, valid discount, and valid usage limits.");
    }
    if (discount_type === "percentage" && discount_value > 100) {
      throw new Error("Percentage discounts cannot exceed 100.");
    }
    const dbPayload: Record<string, unknown> = {
      code,
      title,
      discount_type,
      discount_value,
      min_order_amount,
      max_uses: max_uses ?? null,
      expires_at: expires_at ?? null,
      is_active,
    };
    if (isUuid(coupon.id)) dbPayload.id = coupon.id;
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase.from("coupons")
      .upsert(dbPayload, { onConflict: "code" }).select().single();
    if (error || !data) throw new Error(`Unable to save coupon: ${error?.message || "No coupon returned."}`);
    return {
      id: data.id,
      code: data.code,
      title: data.title || "",
      discount_type: data.discount_type,
      discount_value: Number(data.discount_value),
      min_order_amount: Number(data.min_order_amount),
      max_uses: data.max_uses == null ? undefined : Number(data.max_uses),
      used_count: Number(data.used_count ?? 0),
      expires_at: data.expires_at || undefined,
      is_active: data.is_active ?? true,
    };
  }

  static async deleteCoupon(id: string): Promise<boolean> {
    const supabase = createAdminSupabaseClient();
    const query = supabase.from("coupons").delete();
    const { error } = isUuid(id) ? await query.eq("id", id) : await query.eq("code", id.toUpperCase());
    if (error) throw new Error(`Unable to delete coupon: ${error.message}`);
    return true;
  }
}

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
  display_order: number;
}

export interface TermItem {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
}

export interface BusinessSettings {
  operating_hours: string;
  delivery_zones: string[];
  max_orders_per_slot?: number;
  slot1_start?: string;
  slot1_end?: string;
  slot2_start?: string;
  slot2_end?: string;
  min_order_bag: number;
  max_order_bag?: number;
  min_order_lbs: number;
  max_order_lbs?: number;
  free_delivery_bags: number;
  free_delivery_lbs: number;
  standard_delivery_fee: number;
}

const isUuid = (val?: string): boolean =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

export class ContentService {
  static async getFaqs(): Promise<FaqItem[]> {
    try {
      const supabase = createAdminSupabaseClient();
      const { data, error } = await supabase.from("faqs_and_terms").select("*")
        .eq("category", "faq").eq("is_active", true).order("sort_order", { ascending: true });
      if (error || !data) return [];
      return data.map((item) => ({
        id: item.id,
        question: item.title,
        answer: item.description,
        display_order: item.sort_order ?? 0,
      }));
    } catch {
      return [];
    }
  }

  static async saveFaq(faq: Partial<FaqItem>): Promise<FaqItem> {
    const question = faq.question?.trim() ?? "";
    const answer = faq.answer?.trim() ?? "";
    if (!question || !answer) throw new Error("A question and answer are required.");
    const dbPayload = {
      category: "faq",
      title: question,
      description: answer,
      sort_order: faq.display_order ?? 0,
      is_active: true,
    };
    const supabase = createAdminSupabaseClient();
    const query = isUuid(faq.id)
      ? supabase.from("faqs_and_terms").update(dbPayload).eq("id", faq.id)
      : supabase.from("faqs_and_terms").insert(dbPayload);
    const { data, error } = await query.select().single();
    if (error || !data) throw new Error(`Unable to save FAQ: ${error?.message || "No FAQ returned."}`);
    return { id: data.id, question: data.title, answer: data.description, display_order: data.sort_order ?? 0 };
  }

  static async deleteFaq(id: string): Promise<boolean> {
    const supabase = createAdminSupabaseClient();
    const query = supabase.from("faqs_and_terms").delete().eq("category", "faq");
    const { error } = isUuid(id) ? await query.eq("id", id) : await query.eq("title", id);
    if (error) throw new Error(`Unable to delete FAQ: ${error.message}`);
    return true;
  }

  static async deleteTerm(id: string): Promise<boolean> {
    const supabase = createAdminSupabaseClient();
    const query = supabase.from("faqs_and_terms").delete().in("category", ["term", "guarantee"]);
    const { error } = isUuid(id) ? await query.eq("id", id) : await query.eq("title", id);
    if (error) throw new Error(`Unable to delete terms: ${error.message}`);
    return true;
  }

  static async getTerms(): Promise<TermItem[]> {
    try {
      const supabase = createAdminSupabaseClient();
      const { data, error } = await supabase.from("faqs_and_terms").select("*")
        .in("category", ["term", "guarantee"]).eq("is_active", true).order("sort_order", { ascending: true });
      if (error || !data) return [];
      return data.map((item) => ({
        id: item.id,
        title: item.title,
        subtitle: item.subtitle || "",
        description: item.description,
      }));
    } catch {
      return [];
    }
  }

  static async saveTerm(term: Partial<TermItem>): Promise<TermItem> {
    const title = term.title?.trim() ?? "";
    const subtitle = term.subtitle?.trim() ?? "";
    const description = term.description?.trim() ?? "";
    if (!title || !description) throw new Error("A title and description are required.");
    const dbPayload = {
      category: "term",
      title,
      subtitle,
      description,
      is_active: true,
    };
    const supabase = createAdminSupabaseClient();
    const query = isUuid(term.id)
      ? supabase.from("faqs_and_terms").update(dbPayload).eq("id", term.id)
      : supabase.from("faqs_and_terms").insert(dbPayload);
    const { data, error } = await query.select().single();
    if (error || !data) throw new Error(`Unable to save terms: ${error?.message || "No terms returned."}`);
    return { id: data.id, title: data.title, subtitle: data.subtitle || "", description: data.description };
  }

  static async getSettings(): Promise<BusinessSettings | null> {
    try {
      const supabase = createAdminSupabaseClient();
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "business_operations")
        .maybeSingle();
      if (error || !data) return null;
      return (data?.value as BusinessSettings | undefined) ?? null;
    } catch {
      return null;
    }
  }

  static async updateSettings(updates: Partial<BusinessSettings>): Promise<BusinessSettings> {
    const allowedKeys = [
      "operating_hours", "delivery_zones", "slot1_start", "slot1_end", "slot2_start", "slot2_end",
      "max_orders_per_slot",
      "min_order_bag", "max_order_bag", "min_order_lbs", "max_order_lbs",
      "free_delivery_bags", "free_delivery_lbs", "standard_delivery_fee",
    ] as const;
    if (Object.keys(updates).some((key) => !allowedKeys.includes(key as typeof allowedKeys[number]))) {
      throw new Error("Unsupported business setting.");
    }
    const current = await this.getSettings();
    const settings = { ...current, ...updates } as BusinessSettings;
    const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
    if (Object.prototype.hasOwnProperty.call(updates, "operating_hours") && !settings.operating_hours?.trim()) {
      throw new Error("Enter the business operating days or hours.");
    }
    if (Object.prototype.hasOwnProperty.call(updates, "delivery_zones") &&
      (!Array.isArray(settings.delivery_zones) || !settings.delivery_zones.length ||
        settings.delivery_zones.some((zone) => typeof zone !== "string" || !zone.trim()))) {
      throw new Error("Add at least one valid delivery area.");
    }
    for (const key of ["slot1_start", "slot1_end", "slot2_start", "slot2_end"] as const) {
      if (Object.prototype.hasOwnProperty.call(updates, key) &&
        (typeof settings[key] !== "string" || !timePattern.test(settings[key]))) {
        throw new Error("Enter a valid time for each pickup window.");
      }
    }
    for (const key of [
      "min_order_bag", "max_order_bag", "min_order_lbs", "max_order_lbs",
      "free_delivery_bags", "free_delivery_lbs", "standard_delivery_fee",
    ] as const) {
      const value = updates[key];
      if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
        throw new Error("Enter valid, non-negative business thresholds.");
      }
    }
    if (updates.max_orders_per_slot !== undefined &&
      (!Number.isInteger(updates.max_orders_per_slot) || updates.max_orders_per_slot < 1)) {
      throw new Error("Pickup capacity must be a positive whole number.");
    }
    if ((settings.min_order_bag && settings.max_order_bag && settings.max_order_bag < settings.min_order_bag) ||
      (settings.min_order_lbs && settings.max_order_lbs && settings.max_order_lbs < settings.min_order_lbs)) {
      throw new Error("Maximum order limits must be greater than or equal to minimum limits.");
    }
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("system_settings")
      .upsert({
        key: "business_operations",
        value: settings,
        description: "Operating hours, delivery zones, and thresholds",
        updated_at: new Date().toISOString(),
      })
      .select("value")
      .single();
    if (error || !data) {
      throw new Error(`Unable to save business settings: ${error?.message || "No settings returned."}`);
    }
    return data.value as BusinessSettings;
  }
}

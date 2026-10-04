import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export interface PackagePlan {
  id: string;
  name: string;
  description: string;
  unit_type: "bag" | "lb";
  capacity: number;
  original_price: number;
  discounted_price: number;
  key_points: string[];
  is_active: boolean;
}

export interface PricingConfig {
  bag_price: number;
  min_bags: number;
  max_bags: number;
  pound_price: number;
  min_lbs: number;
  max_lbs: number;
  free_delivery_lbs: number;
  free_delivery_threshold: number;
  standard_delivery_fee: number;
  base_bag_price: number;
  base_pound_price: number;
  one_bag_delivery_fee: number;
}

export class PricingPlanService {
  static async getPlans(): Promise<PackagePlan[]> {
    try {
      const supabase = createAdminSupabaseClient();
      const { data, error } = await supabase.from("plans").select("*").order("created_at", { ascending: true });
      if (error || !data) return [];
      return data.map((item) => ({
        id: item.id,
        name: item.title,
        description: item.description || "",
        unit_type: item.package_type === "weight_tier" ? "lb" : "bag",
        capacity: Number(item.package_type === "weight_tier" ? item.included_lbs : item.included_bags),
        original_price: Number(item.price),
        discounted_price: Number(item.price),
        key_points: Array.isArray(item.key_points) ? item.key_points : [],
        is_active: item.is_active ?? true,
      }));
    } catch {
      return [];
    }
  }

  static async savePlan(plan: Partial<PackagePlan>): Promise<PackagePlan> {
    const isUuid = (val?: string) => Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));
    const name = plan.name?.trim() ?? "";
    const capacity = Number(plan.capacity);
    const price = Number(plan.discounted_price ?? plan.original_price);
    if (!name || !Number.isFinite(capacity) || capacity <= 0 || !Number.isFinite(price) || price <= 0) {
      throw new Error("Enter a package name, positive capacity, and valid price.");
    }
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const finalId = isUuid(plan.id) ? plan.id! : "";

    const dbPayload: Record<string, unknown> = {
      title: name,
      slug,
      description: plan.description?.trim() ?? "",
      package_type: plan.unit_type === "lb" ? "weight_tier" : "bag_bundle",
      included_bags: plan.unit_type === "lb" ? 0 : capacity,
      included_lbs: plan.unit_type === "lb" ? capacity : 0,
      price,
      key_points: plan.key_points ?? [],
      is_active: plan.is_active ?? true,
      updated_at: new Date().toISOString(),
    };
    if (finalId) dbPayload.id = finalId;

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase.from("plans").upsert(dbPayload, { onConflict: "slug" }).select().single();
    if (error || !data) throw new Error(`Unable to save package: ${error?.message || "No package returned."}`);
    return {
      id: data.id,
      name: data.title,
      description: data.description || "",
      unit_type: data.package_type === "weight_tier" ? "lb" : "bag",
      capacity: Number(data.package_type === "weight_tier" ? data.included_lbs : data.included_bags),
      original_price: Number(data.price),
      discounted_price: Number(data.price),
      key_points: Array.isArray(data.key_points) ? data.key_points : [],
      is_active: data.is_active ?? true,
    };
  }

  static async deletePlan(id: string): Promise<boolean> {
    const isUuid = (val?: string) => Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));
    const supabase = createAdminSupabaseClient();
    const query = supabase.from("plans").delete();
    const { error } = isUuid(id)
      ? await query.eq("id", id)
      : await query.eq("slug", id.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
    if (error) throw new Error(`Unable to delete package: ${error.message}`);
    return true;
  }

  static async updatePlan(updates: Partial<PackagePlan>): Promise<PackagePlan> {
    if (!updates.id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(updates.id)) {
      throw new Error("A valid package ID is required.");
    }
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase.from("plans").select("*").eq("id", updates.id).single();
    if (error || !data) throw new Error(`Unable to load package for update: ${error?.message || "Package not found."}`);
    return this.savePlan({
      id: data.id,
      name: updates.name ?? data.title,
      description: updates.description ?? data.description ?? "",
      unit_type: updates.unit_type ?? (data.package_type === "weight_tier" ? "lb" : "bag"),
      capacity: updates.capacity ?? Number(data.package_type === "weight_tier" ? data.included_lbs : data.included_bags),
      original_price: updates.original_price ?? Number(data.price),
      discounted_price: updates.discounted_price ?? Number(data.price),
      key_points: updates.key_points ?? (Array.isArray(data.key_points) ? data.key_points : []),
      is_active: updates.is_active ?? data.is_active ?? true,
    });
  }

  static async getPricing(): Promise<PricingConfig | null> {
    try {
      const supabase = createAdminSupabaseClient();
      const { data, error } = await supabase
        .from("pricing_configs")
        .select("*")
        .eq("is_active", true);
      if (error || !data) return null;
      const bagRow = data.find((row) => row.pricing_type === "per_bag");
      const lbRow = data.find((row) => row.pricing_type === "per_lb");
      if (!bagRow || !lbRow) return null;

      const bPrice = Number(bagRow.unit_price);
      const pPrice = Number(lbRow.unit_price);
      const dFee = Number(bagRow.standard_delivery_fee);
      const minLbs = Number(lbRow.min_order_quantity);
      const maxLbs = Number(lbRow.max_orders_per_slot);
      const freeDeliveryLbs = Number(lbRow.free_delivery_threshold);
      const freeDeliveryBags = Number(bagRow.free_delivery_threshold);
      const minBags = Number(bagRow.min_order_quantity);
      const maxBags = Number(bagRow.max_orders_per_slot);
      const values = [bPrice, pPrice, dFee, minLbs, maxLbs, freeDeliveryLbs, freeDeliveryBags, minBags, maxBags];
      if (values.some((value) => !Number.isFinite(value))) return null;

      return {
        bag_price: bPrice,
        min_bags: minBags,
        max_bags: maxBags,
        pound_price: pPrice,
        min_lbs: minLbs,
        max_lbs: maxLbs,
        free_delivery_lbs: freeDeliveryLbs,
        free_delivery_threshold: freeDeliveryBags,
        standard_delivery_fee: dFee,
        base_bag_price: bPrice,
        base_pound_price: pPrice,
        one_bag_delivery_fee: dFee,
      };
    } catch {
      return null;
    }
  }

  static async updatePricing(updates: Partial<PricingConfig>): Promise<PricingConfig> {
    const bPrice = Number(updates.bag_price ?? updates.base_bag_price);
    const pPrice = Number(updates.pound_price ?? updates.base_pound_price);
    const dFee = Number(updates.standard_delivery_fee ?? updates.one_bag_delivery_fee);
    const freeDeliveryBags = Number(updates.free_delivery_threshold);
    const freeDeliveryLbs = Number(updates.free_delivery_lbs);
    const minBags = Number(updates.min_bags);
    const maxBags = Number(updates.max_bags);
    const minLbs = Number(updates.min_lbs);
    const maxLbs = Number(updates.max_lbs);
    const values = [bPrice, pPrice, dFee, freeDeliveryBags, freeDeliveryLbs, minBags, maxBags, minLbs, maxLbs];
    if (values.some((value) => !Number.isFinite(value) || value < 0) ||
      bPrice === 0 || pPrice === 0 || minBags === 0 || maxBags < minBags || minLbs === 0 || maxLbs < minLbs) {
      throw new Error("Enter valid prices and order limits before saving.");
    }

    const pricing: PricingConfig = {
      bag_price: bPrice,
      min_bags: minBags,
      max_bags: maxBags,
      pound_price: pPrice,
      min_lbs: minLbs,
      max_lbs: maxLbs,
      free_delivery_lbs: freeDeliveryLbs,
      free_delivery_threshold: freeDeliveryBags,
      standard_delivery_fee: dFee,
      base_bag_price: bPrice,
      base_pound_price: pPrice,
      one_bag_delivery_fee: dFee,
    };

    const supabase = createAdminSupabaseClient();
    const { error } = await supabase.from("pricing_configs").upsert([
        {
          pricing_type: "per_bag",
          unit_price: bPrice,
          min_order_quantity: minBags,
          max_orders_per_slot: maxBags,
          free_delivery_threshold: freeDeliveryBags,
          standard_delivery_fee: dFee,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          pricing_type: "per_lb",
          unit_price: pPrice,
          min_order_quantity: minLbs,
          free_delivery_threshold: freeDeliveryLbs,
          max_orders_per_slot: maxLbs,
          standard_delivery_fee: dFee,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
      ], { onConflict: "pricing_type" });
    if (error) throw new Error(`Unable to save pricing: ${error.message}`);
    return pricing;
  }
}

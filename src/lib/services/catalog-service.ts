import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export interface DetergentItem {
  id: string;
  name: string;
  type: "liquid" | "powder" | "pods";
  brand: string;
  price: number;
  description: string;
  is_active: boolean;
}

const isUuid = (val?: string): boolean =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

export class CatalogService {
  static async getCatalog(): Promise<{ detergents: DetergentItem[] }> {
    try {
      const supabase = createAdminSupabaseClient();
      const { data, error } = await supabase.from("catalog_items").select("*")
        .eq("category", "detergent").order("created_at", { ascending: true });
      if (error || !data) return { detergents: [] };
      return {
        detergents: data.map((item) => ({
          id: item.id,
          name: item.name,
          type: item.item_type as DetergentItem["type"],
          brand: item.brand || "",
          price: Number(item.price ?? 0),
          description: item.description || "",
          is_active: item.is_active ?? true,
        })),
      };
    } catch {
      return { detergents: [] };
    }
  }

  static async saveDetergent(item: Partial<DetergentItem>): Promise<DetergentItem> {
    const name = item.name?.trim() ?? "";
    const brand = item.brand?.trim() ?? "";
    const description = item.description?.trim() ?? "";
    const price = Number(item.price);
    if (!name || !brand || !description || !Number.isFinite(price) || price < 0 ||
      !["liquid", "powder", "pods"].includes(item.type ?? "")) {
      throw new Error("Enter a name, brand, supported detergent type, description, and valid price.");
    }
    const payload = {
        category: "detergent",
        name,
        brand,
        item_type: item.type,
        price,
        description,
        is_active: item.is_active ?? true,
        in_stock: item.is_active ?? true,
      };
    const supabase = createAdminSupabaseClient();
    const query = isUuid(item.id)
      ? supabase.from("catalog_items").update(payload).eq("id", item.id)
      : supabase.from("catalog_items").insert(payload);
    const { data, error } = await query.select().single();
    if (error || !data) throw new Error(`Unable to save detergent: ${error?.message || "No detergent returned."}`);
    return {
      id: data.id,
      name: data.name,
      type: data.item_type as DetergentItem["type"],
      brand: data.brand || "",
      price: Number(data.price ?? 0),
      description: data.description || "",
      is_active: data.is_active ?? true,
    };
  }

  static async deleteItem(id: string): Promise<boolean> {
    if (!isUuid(id)) throw new Error("A valid detergent ID is required.");
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase.from("catalog_items").delete().eq("id", id).eq("category", "detergent");
    if (error) throw new Error(`Unable to delete detergent: ${error.message}`);
    return true;
  }
}

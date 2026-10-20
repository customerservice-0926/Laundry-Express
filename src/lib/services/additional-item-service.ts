import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { AdditionalItem } from "@/types";

export class AdditionalItemService {
  private static readonly SETTINGS_KEY = "additional_items";

  /**
   * Retrieves additional and specialty items from Supabase system_settings.
   */
  static async getItems(all: boolean = false): Promise<AdditionalItem[]> {
    try {
      const supabase = createAdminSupabaseClient();
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", this.SETTINGS_KEY)
        .maybeSingle();

      if (error || !data?.value) return [];
      const val = data.value as { items?: AdditionalItem[] };
      const items = Array.isArray(val.items) ? val.items : [];
      return all ? items : items.filter((i) => i.is_active !== false);
    } catch {
      return [];
    }
  }

  /**
   * Adds or updates a specialty item in Supabase system_settings.
   */
  static async saveItem(item: Partial<AdditionalItem>): Promise<AdditionalItem> {
    const name = item.name?.trim() ?? "";
    const category = item.category?.trim() || "specialty";
    const description = item.description?.trim() ?? "";
    const price = Number(item.price);

    if (!name || !Number.isFinite(price) || price < 0) {
      throw new Error("Enter a valid item name and non-negative price.");
    }

    const items = await this.getItems(true);
    let targetItem: AdditionalItem;

    if (item.id) {
      const idx = items.findIndex((i) => i.id === item.id);
      if (idx >= 0) {
        targetItem = {
          ...items[idx],
          name,
          category,
          price,
          description,
          is_active: item.is_active ?? items[idx].is_active ?? true,
        };
        items[idx] = targetItem;
      } else {
        targetItem = {
          id: item.id,
          name,
          category,
          price,
          description,
          is_active: item.is_active ?? true,
          created_at: new Date().toISOString(),
        };
        items.push(targetItem);
      }
    } else {
      const newId = `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      targetItem = {
        id: newId,
        name,
        category,
        price,
        description,
        is_active: item.is_active ?? true,
        created_at: new Date().toISOString(),
      };
      items.push(targetItem);
    }

    const supabase = createAdminSupabaseClient();
    const { error } = await supabase.from("system_settings").upsert(
      {
        key: this.SETTINGS_KEY,
        value: { items },
        description: "Specialty and additional clothing catalog items",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    if (error) {
      throw new Error(`Unable to save additional item: ${error.message}`);
    }

    return targetItem;
  }

  /**
   * Deletes a specialty item from Supabase system_settings.
   */
  static async deleteItem(id: string): Promise<boolean> {
    const items = await this.getItems(true);
    const updated = items.filter((i) => i.id !== id);
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase.from("system_settings").upsert(
      {
        key: this.SETTINGS_KEY,
        value: { items: updated },
        description: "Specialty and additional clothing catalog items",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    if (error) {
      throw new Error(`Unable to delete item: ${error.message}`);
    }
    return true;
  }
}


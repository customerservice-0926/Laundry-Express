import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { mapOrderRecord } from "@/lib/services/order-record-mapper";
import type { CustomerAccount } from "@/components/admin/customer-detail-modal";
import type { OrderReview } from "@/types";

export class CustomerService {
  static async getCustomers(): Promise<CustomerAccount[]> {
    try {
      const supabase = createAdminSupabaseClient();
      const [{ data: users }, { data: orders }, { data: reviews }] =
        await Promise.all([
          supabase.from("users")
            .select("id,full_name,email,phone,address,role,created_at")
            .order("created_at", { ascending: false }),
          supabase.from("orders").select("*, proofs:order_proofs(*)").order("created_at", { ascending: false }),
          supabase.from("reviews").select("*").order("created_at", { ascending: false }),
        ]);

    const customers = new Map<string, CustomerAccount>();
    const adminEmails = new Set((users || [])
      .filter((user) => user.role === "admin")
      .map((user) => user.email.toLowerCase()));
    for (const user of users || []) {
      if (user.role !== "customer") continue;
      customers.set(user.email.toLowerCase(), {
        id: user.id,
        full_name: user.full_name || "Customer",
        email: user.email,
        phone: user.phone || "—",
        address: user.address || "—",
        joined_date: user.created_at
          ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
          : "Recently",
        orders: [],
        reviews: [],
        payments: [],
      });
    }

    for (const order of orders || []) {
      const email = String(order.customer_email || "").trim().toLowerCase();
      if (!email || customers.has(email) || adminEmails.has(email)) continue;
      customers.set(email, {
        id: order.user_id || `cust-${order.id}`,
        full_name: order.customer_name || "Customer",
        email,
        phone: order.customer_phone || "—",
        address: order.street_address || "—",
        joined_date: order.created_at
          ? new Date(order.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
          : "Recently",
        orders: [],
        reviews: [],
        payments: [],
      });
    }

    for (const customer of customers.values()) {
      const email = customer.email.toLowerCase();
      const customerOrders = (orders || []).filter((order) =>
        (order.customer_email && order.customer_email.toLowerCase() === email) ||
        (order.user_id && order.user_id === customer.id));
      customer.orders = customerOrders.map(mapOrderRecord);
      customer.reviews = (reviews || []).filter((review) =>
        review.user_id === customer.id) as OrderReview[];
      customer.payments = customerOrders.map((order) => ({
        id: `pay-${order.id}`,
        amount: Number(order.total_amount || 0),
        date: order.created_at
          ? new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : "Recent",
        method: order.payment_method === "card" ? "Credit Card"
          : order.payment_method === "apple_pay" ? "Apple Pay"
            : order.payment_method === "google_pay" ? "Google Pay" : "Doorstep Payment",
        status: order.payment_status === "paid" ? "succeeded"
          : order.payment_status === "refunded" ? "refunded"
            : order.payment_status === "failed" ? "failed" : "pending",
        order_number: order.order_number,
      }));
    }
    return Array.from(customers.values());
    } catch {
      return [];
    }
  }

  /**
   * Creates a customer user profile if one does not already exist.
   */
  static async createCustomer(data: {
    full_name: string;
    email: string;
    phone?: string;
    address?: string;
  }): Promise<{ id: string; full_name: string; email: string }> {
    const supabase = createAdminSupabaseClient();
    const cleanEmail = data.email.trim().toLowerCase();

    // Check if user already exists
    const { data: existing } = await supabase
      .from("users")
      .select("id, full_name, email")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existing) {
      return { id: existing.id, full_name: existing.full_name, email: existing.email };
    }

    const { data: created, error } = await supabase
      .from("users")
      .insert({
        full_name: data.full_name.trim(),
        email: cleanEmail,
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        role: "customer",
        is_active: true,
      })
      .select("id, full_name, email")
      .single();

    if (error || !created) {
      throw new Error(`Unable to create customer account: ${error?.message || "Unknown error"}`);
    }

    return { id: created.id, full_name: created.full_name, email: created.email };
  }

  /**
   * Updates an existing customer profile and associated orders.
   */
  static async updateCustomer(
    userId: string,
    data: { full_name?: string; email?: string; phone?: string; address?: string }
  ): Promise<boolean> {
    const supabase = createAdminSupabaseClient();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.full_name !== undefined) updates.full_name = data.full_name.trim();
    if (data.email !== undefined) updates.email = data.email.trim().toLowerCase();
    if (data.phone !== undefined) updates.phone = data.phone.trim();
    if (data.address !== undefined) updates.address = data.address.trim();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    if (isUuid) {
      const { error } = await supabase.from("users").update(updates).eq("id", userId);
      if (error) throw new Error(`Unable to update customer profile: ${error.message}`);
    }

    // Sync contact details onto orders
    const orderUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.full_name !== undefined) orderUpdates.customer_name = data.full_name.trim();
    if (data.phone !== undefined) orderUpdates.customer_phone = data.phone.trim();
    if (data.address !== undefined) orderUpdates.street_address = data.address.trim();

    if (isUuid) {
      await supabase.from("orders").update(orderUpdates).eq("user_id", userId);
    } else if (userId.startsWith("cust-")) {
      const orderId = userId.replace("cust-", "");
      await supabase.from("orders").update(orderUpdates).eq("id", orderId);
    }
    if (data.email) {
      await supabase.from("orders").update(orderUpdates).eq("customer_email", data.email.trim().toLowerCase());
    }

    return true;
  }

  /**
   * Deletes a customer account and associated records cleanly.
   */
  static async deleteCustomer(userId: string): Promise<boolean> {
    const supabase = createAdminSupabaseClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    if (isUuid) {
      // Clean up child records to prevent foreign key constraint violations
      await supabase.from("user_addresses").delete().eq("user_id", userId);
      await supabase.from("reviews").delete().eq("user_id", userId);
      // Unlink orders from deleted user account so historical accounting remains intact
      await supabase.from("orders").update({ user_id: null }).eq("user_id", userId);

      const { error } = await supabase.from("users").delete().eq("id", userId);
      if (error) throw new Error(`Unable to delete customer account: ${error.message}`);
    } else {
      if (userId.startsWith("cust-")) {
        const orderId = userId.replace("cust-", "");
        await supabase.from("orders").delete().eq("id", orderId);
      } else {
        await supabase.from("orders").delete().eq("customer_email", userId.toLowerCase());
      }
    }
    return true;
  }
}

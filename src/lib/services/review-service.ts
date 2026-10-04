import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { OrderReview } from "@/types";

/**
 * Review Service
 * Manages customer reviews with up to 3 photos and administrative moderation.
 */

function extractPhotoUrls(photosRaw: unknown): string[] {
  if (!photosRaw) return [];
  if (Array.isArray(photosRaw)) {
    return photosRaw
      .map((p) => (typeof p === "string" ? p : p && typeof p === "object" && "photo_url" in p ? (p as { photo_url: string }).photo_url : ""))
      .filter((url): url is string => typeof url === "string" && url.trim().length > 0);
  }
  if (typeof photosRaw === "string") {
    try {
      const parsed = JSON.parse(photosRaw);
      return extractPhotoUrls(parsed);
    } catch {
      return photosRaw.startsWith("http") ? [photosRaw] : [];
    }
  }
  return [];
}

export class ReviewService {
  /**
   * Returns reviews. If onlyApproved is true, returns public approved reviews for landing page.
   */
  static async getReviews(onlyApproved: boolean = false, userId?: string): Promise<OrderReview[]> {
    try {
      const supabase = createAdminSupabaseClient();
      let q = supabase.from("reviews").select("*").order("created_at", { ascending: false });
      if (onlyApproved) q = q.eq("status", "approved");
      if (userId) q = q.eq("user_id", userId);
      const { data, error } = await q;
      if (error || !data) return [];
      return data.map((r) => {
        const photoUrls = extractPhotoUrls(r.photos);
        return {
          id: r.id,
          order_id: r.order_id,
          user_id: r.user_id || "",
          customer_name: r.customer_name || "Verified Customer",
          rating: Number(r.rating || 5),
          comment: r.comment || "",
          status: r.status || "pending",
          photo_urls: photoUrls,
          photos: photoUrls.map((url, i) => ({
            id: `${r.id}-${i}`,
            review_id: r.id,
            photo_url: url,
            display_order: (Math.min(3, i + 1) as 1 | 2 | 3),
            created_at: r.created_at,
          })),
          created_at: r.created_at,
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Submits a customer review with up to 3 photos.
   * Enforces: order must be completed, one review per order per user.
   */
  static async submitReview(input: {
    orderId: string;
    userId: string;
    customerName: string;
    rating: number;
    comment: string;
    photoUrls?: string[];
  }): Promise<{ success: boolean; review?: OrderReview; error?: string }> {
    if (!input.orderId || !input.comment?.trim() || !Number.isInteger(input.rating) ||
      input.rating < 1 || input.rating > 5 || input.comment.length > 2000) {
      return { success: false, error: "Order ID, rating, and review text are required." };
    }

    try {
      const supabase = createAdminSupabaseClient();

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.orderId);
      const { data: order, error: orderError } = isUuid
        ? await supabase
            .from("orders")
            .select("id, order_number, order_status, user_id, customer_email")
            .eq("id", input.orderId)
            .maybeSingle()
        : await supabase
            .from("orders")
            .select("id, order_number, order_status, user_id, customer_email")
            .eq("order_number", input.orderId)
            .maybeSingle();

      if (orderError) throw new Error(`Unable to verify order: ${orderError.message}`);
      if (!order) return { success: false, error: "Order not found." };
      if (order.user_id && order.user_id !== input.userId) {
        return { success: false, error: "You can only review your own orders." };
      }
      if (order.order_status !== "completed") {
        return { success: false, error: "You can only review completed orders." };
      }

      // Enforce one review per order
      const { data: existing, error: existingError } = await supabase
        .from("reviews")
        .select("id")
        .eq("order_id", order.id)
        .eq("user_id", input.userId)
        .maybeSingle();

      if (existingError) {
        throw new Error(`Unable to check existing review: ${existingError.message}`);
      }
      if (existing) return { success: false, error: "You have already submitted a review for this order." };

      const photos = (input.photoUrls || []).slice(0, 3);
      if (photos.some((url) => typeof url !== "string" || !url.includes("review-photos") || url.length > 2048)) {
        return { success: false, error: "Review photos must be valid uploaded images." };
      }

      const initialStatus: "approved" | "pending" = "approved"; // Automatically published for customer, admin can moderate/delete

      const { data: revData, error } = await supabase
        .from("reviews")
        .insert({
          order_id: order.id,
          user_id: input.userId,
          customer_name: input.customerName || "Customer",
          rating: Math.min(5, Math.max(1, input.rating)),
          comment: input.comment.trim(),
          photos,
          status: initialStatus,
        })
        .select()
        .single();

      if (error || !revData) throw new Error(error?.message || "Insert failed");

      const newRev: OrderReview = {
        id: revData.id,
        order_id: revData.order_id,
        user_id: revData.user_id,
        customer_name: revData.customer_name,
        rating: revData.rating,
        comment: revData.comment,
        status: initialStatus,
        photo_urls: photos,
        photos: photos.map((url, i) => ({
          id: `${revData.id}-${i}`,
          review_id: revData.id,
          photo_url: url,
          display_order: (Math.min(3, i + 1) as 1 | 2 | 3),
          created_at: revData.created_at,
        })),
        created_at: revData.created_at,
      };
      return { success: true, review: newRev };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit review.";
      return { success: false, error: msg };
    }
  }

  /**
   * Admin updates review status (approve or reject)
   */
  static async updateReviewStatus(reviewId: string, status: "approved" | "rejected" | "pending"): Promise<boolean> {
    if (!["approved", "rejected", "pending"].includes(status)) throw new Error("Invalid review status.");
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase.from("reviews").update({ status }).eq("id", reviewId).select("id").maybeSingle();
    if (error || !data) throw new Error(`Unable to update review: ${error?.message || "Review not found."}`);
    return true;
  }

  /**
   * Admin deletes spam review
   */
  static async deleteReview(reviewId: string): Promise<boolean> {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase.from("reviews").delete().eq("id", reviewId).select("id").maybeSingle();
    if (error || !data) throw new Error(`Unable to delete review: ${error?.message || "Review not found."}`);
    return true;
  }
}

export interface ReviewPhoto {
  id: string;
  review_id: string;
  photo_url: string;
  display_order: 1 | 2 | 3;
  created_at: string;
}

export interface OrderReview {
  id: string;
  order_id: string;
  user_id: string;
  rating: number;
  comment: string;
  status: "pending" | "approved" | "rejected";
  moderated_by?: string;
  moderation_note?: string;
  moderated_at?: string;
  created_at: string;
  updated_at?: string;
  customer_name?: string;
  photo_urls?: string[];
  photos?: ReviewPhoto[];
  user?: { full_name: string };
  order?: { order_number: string };
}

export type UserRole = "customer" | "admin";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  name?: string;
  avatar_url?: string;
  phone?: string;
  address?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type PricingMode = "per_bag" | "per_lb" | "package";

export interface PricingConfig {
  id?: string;
  pricing_type?: "per_bag" | "per_lb";
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
  one_bag_delivery_fee?: number;
}

export interface LaundryPackage {
  id: string;
  title: string;
  slug: string;
  description: string;
  package_type: "bag_bundle" | "weight_tier" | "subscription";
  included_bags?: number;
  included_lbs?: number;
  price: number;
  validity_days: number;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
}

export interface UserPackage {
  id: string;
  user_id: string;
  package_id: string;
  remaining_bags: number;
  remaining_lbs: number;
  expires_at: string;
  is_active: boolean;
  created_at: string;
  package?: LaundryPackage;
}

export interface Promotion {
  id: string;
  code: string;
  title: string;
  discount_type: "percentage" | "fixed_amount" | "free_delivery";
  discount_value: number;
  min_order_amount: number;
  max_discount_amount?: number;
  usage_limit_total?: number;
  usage_limit_per_user: number;
  used_count: number;
  start_date: string;
  end_date: string;
  banner_image_url?: string;
  is_banner_active: boolean;
  is_active: boolean;
}

export interface Detergent {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  price_adjustment: number;
  created_at?: string;
}

export type User = UserProfile;

export type OrderStatus = "pending" | "confirmed" | "driver_assigned" | "picked_up" | "in_wash" | "out_for_delivery" | "completed" | "cancelled";

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  pricing_mode: PricingMode;
  package_id?: string | null;
  package_name?: string | null;
  detergent_id: string;
  detergent_name?: string;
  bag_count: number;
  estimated_weight_lbs?: number | null;
  final_weight_lbs?: number | null;
  pickup_date: string;
  pickup_slot: "8am-12pm" | "1pm-6pm";
  delivery_date?: string | null;
  delivery_slot?: string | null;
  subtotal: number;
  detergent_fee?: number;
  discount_amount: number;
  coupon_code?: string | null;
  promotion_id?: string | null;
  delivery_fee: number;
  tax_amount: number;
  total_amount: number;
  is_out_of_home: boolean;
  bag_outside_door_confirmed: boolean;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  pickup_address?: string;
  street_address?: string;
  apt_unit?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  customer_notes?: string;
  special_instructions?: string;
  admin_notes?: string;
  payment_method?: string;
  payment_status?: string;
  invoice_email_sent_at?: string | null;
  order_status: OrderStatus;
  stripe_customer_id?: string;
  stripe_payment_method_id?: string;
  card_brand?: string;
  card_last4?: string;
  stripe_payment_intent?: string;
  has_preexisting_damage?: boolean;
  damage_notes?: string;
  damage_photo_url?: string;
  customer_notified_damage?: boolean;
  accepted_at?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  user?: UserProfile;
  detergent?: Detergent;
  proofs?: OrderProof[];
  payment?: PaymentRecord;
  review?: OrderReview;
}

export interface OrderProof {
  id: string;
  order_id: string;
  proof_type: "pickup" | "dropoff" | "damage";
  image_url: string;
  notes?: string;
  uploaded_by: string;
  created_at: string;
}

export type PaymentStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "refunded"
  | "partially_refunded";

export interface PaymentRecord {
  id: string;
  payment_number: string;
  order_id: string;
  user_id: string;
  provider: "stripe" | "package_credit";
  provider_payment_id?: string;
  amount: number;
  currency: string;
  payment_method_type: string;
  status: PaymentStatus;
  receipt_url?: string;
  failure_reason?: string;
  refunded_amount: number;
  metadata?: Record<string, unknown>;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

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

export interface ActivityLog {
  id: string;
  user_id?: string | null;
  user_role: "customer" | "admin" | "system";
  action: string;
  entity_type: "order" | "payment" | "review" | "user" | "pricing" | "package" | "promotion";
  entity_id?: string | null;
  description: string;
  metadata?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface AdminPaymentTransaction {
  id: string;
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  date: string;
  amount: number;
  method: string;
  card_last4: string;
  status: "succeeded" | "pending" | "failed" | "refunded";
  stripe_payment_intent: string;
}

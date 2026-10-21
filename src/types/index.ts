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

export type User = UserProfile;

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

export interface AdditionalItem {
  id: string;
  name: string;
  category?: string;
  price: number;
  description?: string;
  is_active: boolean;
  created_at?: string;
}

export interface Detergent {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  price_adjustment: number;
  created_at?: string;
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

// Re-export modular types
export * from "./order";
export * from "./payment";
export * from "./review";
